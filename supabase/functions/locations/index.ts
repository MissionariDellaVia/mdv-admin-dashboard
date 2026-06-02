// Locations API - GET /locations?lang=it  (lettura pubblica per webapp + mobile)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { shapeLocations } from "../_shared/locations-shape.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const lang = url.searchParams.get("lang") || "it";
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );
    const { data, error } = await supabaseClient
      .from("locations")
      .select(`id, slug, name, lang, address, latitude, longitude, cover_image, intro, position,
        location_info ( id, title, body, images, position )`)
      .eq("lang", lang)
      .eq("is_published", true)
      .order("position", { ascending: true });
    if (error) {
      return new Response(JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: eventsData } = await supabaseClient
      .from("events")
      .select("*")
      .or(`lang.is.null,lang.eq.${lang}`)
      .eq("is_published", true)
      .order("position", { ascending: true });

    const response = shapeLocations(data ?? [], eventsData ?? []);
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=300" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal server error", message: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
