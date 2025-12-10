// Gospel Info API - GET /gospel-info?date=YYYY-MM-DD
// Returns saints and liturgical season for a given date

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const date = url.searchParams.get("date");

    if (!date) {
      return new Response(
        JSON.stringify({ error: "Missing date parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Query gospel_daily for the given date
    const { data, error } = await supabaseClient
      .from("gospel_daily")
      .select("saints, liturgical_season")
      .eq("date", date)
      .maybeSingle();

    if (error || !data) {
      return new Response(
        JSON.stringify({ saints: "", liturgy: "" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        saints: data.saints || "",
        liturgy: data.liturgical_season || "",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
