// admin-delete-collaborator — rimuove un collaboratore (solo admin):
// cancella le assegnazioni luoghi, il profilo e l'utente Auth.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const url = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    // 1. Identifica il chiamante dal suo JWT.
    const authHeader = req.headers.get("Authorization") ?? "";
    const caller = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: callerUser } } = await caller.auth.getUser();
    if (!callerUser) return json({ error: "Non autenticato" }, 401);

    const admin = createClient(url, serviceKey);

    // 2. Verifica che il chiamante sia admin.
    const { data: callerProfile } = await admin
      .from("profiles").select("role").eq("id", callerUser.id).single();
    if (callerProfile?.role !== "admin") return json({ error: "Solo gli admin" }, 403);

    // 3. Valida l'input.
    const { userId } = await req.json() as { userId?: string };
    if (!userId) return json({ error: "userId richiesto" }, 400);
    if (userId === callerUser.id) return json({ error: "Non puoi eliminare te stesso" }, 400);

    // 4. Solo collaboratori (mai un altro admin).
    const { data: target } = await admin
      .from("profiles").select("role").eq("id", userId).single();
    if (!target) return json({ error: "Collaboratore non trovato" }, 404);
    if (target.role !== "collaborator") {
      return json({ error: "Si possono eliminare solo i collaboratori" }, 403);
    }

    // 5. Pulisci assegnazioni + profilo, poi rimuovi l'utente Auth.
    await admin.from("location_editors").delete().eq("user_id", userId);
    await admin.from("profiles").delete().eq("id", userId);
    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr) return json({ error: delErr.message }, 400);

    return json({ id: userId, deleted: true });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
