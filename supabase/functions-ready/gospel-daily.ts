import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
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

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const { data: gospelDaily, error } = await supabaseClient
      .from("gospel_daily")
      .select(`
        *,
        gospel:gospels(*),
        comment_sections(*),
        media(*)
      `)
      .eq("date", date)
      .eq("is_published", true)
      .single();

    if (error || !gospelDaily) {
      return new Response(
        JSON.stringify({ error: "Gospel not found for this date" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const mainComment = gospelDaily.comment_sections?.find((c) => c.section_type === "main");
    const extraComment = gospelDaily.comment_sections?.find((c) => c.section_type === "reflection" || c.section_type === "application");
    const videos = gospelDaily.media?.filter((m) => m.type === "video").map((m) => m.url) || [];

    const { data: connected } = await supabaseClient
      .from("gospel_daily")
      .select(`date, comment_sections(*)`)
      .eq("gospel_id", gospelDaily.gospel_id)
      .neq("date", date)
      .eq("is_published", true)
      .order("date", { ascending: false })
      .limit(5);

    const connectedEntries = (connected || []).map((entry) => {
      const entryMain = entry.comment_sections?.find((c) => c.section_type === "main");
      const entryExtra = entry.comment_sections?.find((c) => c.section_type === "reflection" || c.section_type === "application");
      return {
        date: entry.date,
        comment: entryMain?.content || "",
        extra: entryExtra?.content || "",
      };
    });

    const response = {
      today: {
        evangelist: gospelDaily.gospel?.evangelist || "",
        textRef: gospelDaily.gospel?.reference || "",
        sacred_texts: "Lettura del Vangelo",
        text: gospelDaily.gospel?.text || "",
        comment: mainComment?.content || "",
        extra: extraComment?.content || "",
        video: videos[0] || "",
      },
      connected: connectedEntries,
      videos: videos,
    };

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
