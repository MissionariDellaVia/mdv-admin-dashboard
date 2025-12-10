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
    const version = url.searchParams.get("version") || "2";

    if (!date) {
      return new Response(
        JSON.stringify({ error: "Missing 'date' parameter. Use format: YYYY-MM-DD" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return new Response(
        JSON.stringify({ error: "Invalid date format. Use: YYYY-MM-DD" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Execute both queries in parallel for better performance
    const [gospelResult, relatedResult] = await Promise.all([
      supabaseClient
        .from("gospel_daily")
        .select(`
          id,
          date,
          gospel_id,
          saints,
          liturgical_season,
          sacred_texts,
          gospel:gospels(id, reference, evangelist, text),
          comment_sections(section_type, content),
          media(type, url, alt_text)
        `)
        .eq("date", date)
        .maybeSingle(),

      // We'll fetch related after we know gospel_id, but prepare the client
      Promise.resolve(null)
    ]);

    const { data: gospelDaily, error } = gospelResult;

    if (error || !gospelDaily) {
      return new Response(
        JSON.stringify({ error: "Gospel not found for this date", date }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Now fetch related in parallel with processing
    const relatedPromise = supabaseClient
      .from("gospel_daily")
      .select(`
        id,
        date,
        saints,
        comment_sections(section_type, content),
        media(type, url)
      `)
      .eq("gospel_id", gospelDaily.gospel_id)
      .neq("date", date)
      .order("date", { ascending: false })
      .limit(10);

    const sections = gospelDaily.comment_sections || [];
    const mainComment = sections.find((c: any) => c.section_type === "main");
    const reflectionComment = sections.find(
      (c: any) => c.section_type === "reflection" || c.section_type === "application"
    );

    const mediaItems = gospelDaily.media || [];
    const videos = mediaItems.filter((m: any) => m.type === "video").map((m: any) => m.url);
    const images = mediaItems.filter((m: any) => m.type === "image").map((m: any) => ({ url: m.url, alt: m.alt_text }));

    // Wait for related data
    const { data: relatedData } = await relatedPromise;

    const related = (relatedData || []).map((entry: any) => {
      const entryMain = entry.comment_sections?.find((c: any) => c.section_type === "main");
      const entryExtra = entry.comment_sections?.find((c: any) => c.section_type === "reflection" || c.section_type === "application");
      const entryVideos = (entry.media || [])
        .filter((m: any) => m.type === "video")
        .map((m: any) => m.url);
      return {
        id: entry.id,
        date: entry.date,
        saints: entry.saints || "",
        comment: entryMain?.content || "",
        extra: entryExtra?.content || "",
        videos: entryVideos,
      };
    });

    // Collect all videos (today + related)
    const allVideos = [
      ...videos,
      ...related.flatMap((r: any) => r.videos || [])
    ];

    let response;

    if (version === "1") {
      // Legacy V1 format
      response = {
        today: {
          date: gospelDaily.date,
          saints: gospelDaily.saints || "",
          sacred_texts: gospelDaily.sacred_texts || "",
          evangelist: gospelDaily.gospel?.evangelist || "",
          text: gospelDaily.gospel?.text || "",
          textRef: gospelDaily.gospel?.reference || "",
          comment: mainComment?.content || "",
          extra: reflectionComment?.content || "",
          liturgical_season: gospelDaily.liturgical_season || "",
        },
        connected: related.map((r) => ({
          date: r.date,
          comment: r.comment,
          extra: r.extra,
        })),
        videos: allVideos,
      };
    } else {
      // New V2 format (default)
      response = {
        id: gospelDaily.id,
        date: gospelDaily.date,
        saints: gospelDaily.saints || "",
        liturgical_season: gospelDaily.liturgical_season,
        sacred_texts: gospelDaily.sacred_texts,
        gospel: {
          id: gospelDaily.gospel?.id || 0,
          reference: gospelDaily.gospel?.reference || "",
          evangelist: gospelDaily.gospel?.evangelist || "",
          text: gospelDaily.gospel?.text || "",
        },
        comments: {
          main: mainComment?.content || null,
          reflection: reflectionComment?.content || null,
        },
        media: {
          videos: allVideos,
          images,
        },
        related: related.map((r) => ({
          id: r.id,
          date: r.date,
          saints: r.saints,
          comments: {
            main: r.comment || null,
            reflection: r.extra || null,
          },
          videos: r.videos,
        })),
      };
    }

    return new Response(JSON.stringify(response), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300",
        "X-API-Version": version,
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal server error", message: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
