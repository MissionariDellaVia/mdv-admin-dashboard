// admin-reset-password — rigenera la password temporanea di un collaboratore (solo admin).
// Ritorna la nuova password temporanea (mostrata una sola volta dalla dashboard).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Password temporanea leggibile: 12 char alfanumerici (no caratteri ambigui).
function tempPassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

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

    // 4. Verifica che il target sia un collaboratore (non resettare altri admin).
    const { data: target } = await admin
      .from("profiles").select("role, email").eq("id", userId).single();
    if (!target) return json({ error: "Collaboratore non trovato" }, 404);
    if (target.role !== "collaborator") {
      return json({ error: "Si possono resettare solo i collaboratori" }, 403);
    }

    // 5. Imposta la nuova password e forza il cambio al prossimo accesso.
    const password = tempPassword();
    const { error: updErr } = await admin.auth.admin.updateUserById(userId, { password });
    if (updErr) return json({ error: updErr.message }, 400);

    const { error: profErr } = await admin
      .from("profiles").update({ must_change_password: true }).eq("id", userId);
    if (profErr) return json({ error: profErr.message }, 500);

    return json({ id: userId, email: target.email, tempPassword: password });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
