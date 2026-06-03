// admin-invite — crea un collaboratore (solo admin). Ritorna la password temporanea.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

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
    const { email, slugs } = await req.json() as { email?: string; slugs?: string[] };
    if (!email || !Array.isArray(slugs) || slugs.length === 0) {
      return json({ error: "email e almeno un luogo sono richiesti" }, 400);
    }

    // 4. Crea l'utente già attivo con password temporanea.
    const password = tempPassword();
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
    });
    if (createErr || !created.user) {
      return json({ error: createErr?.message ?? "Creazione utente fallita" }, 400);
    }
    const newId = created.user.id;

    // 5. Profilo collaboratore + assegnazioni luoghi.
    await admin.from("profiles").upsert(
      { id: newId, role: "collaborator", email, must_change_password: true },
      { onConflict: "id" },
    );
    await admin.from("location_editors").upsert(
      slugs.map((s) => ({ user_id: newId, location_slug: s })),
      { onConflict: "user_id,location_slug" },
    );

    return json({ id: newId, email, tempPassword: password });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
