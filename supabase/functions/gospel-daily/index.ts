// Gospel Daily API - GET /gospel-daily?date=YYYY-MM-DD
// Returns the full gospel of the day with structured content
//
// Optional: ?version=1 for legacy format (default: v2)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// ============================================
// TYPE DEFINITIONS
// ============================================

// V2 Response (new structure)
interface GospelDailyResponseV2 {
  id: number;
  date: string;
  saints: string;
  liturgical_season: string | null;
  sacred_texts: string | null;
  gospel: {
    id: number;
    reference: string;
    evangelist: string;
    text: string;
  };
  comments: {
    main: string | null;
    reflection: string | null;
  };
  media: {
    videos: string[];
    images: Array<{ url: string; alt: string | null }>;
  };
  related: Array<{
    id: number;
    date: string;
    saints: string;
    excerpt: string;
    videos: string[];
  }>;
}

// V1 Response (legacy, for backward compatibility)
interface GospelDailyResponseV1 {
  today: {
    date: string;
    saints: string;
    sacred_texts: string;
    evangelist: string;
    text: string;
    textRef: string;
    comment: string;
    extra: string;
    liturgical_season: string;
  };
  connected: Array<{
    date: string;
    comment: string;
    extra: string;
  }>;
  videos: string[];
}

// ============================================
// HELPERS
// ============================================

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

function truncate(text: string, maxLength: number): string {
  const stripped = stripHtml(text);
  if (stripped.length <= maxLength) return stripped;
  return stripped.substring(0, maxLength).trim() + "...";
}

// ============================================
// MAIN HANDLER
// ============================================

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const date = url.searchParams.get("date");
    const version = url.searchParams.get("version") || "2";

    // Validate date parameter
    if (!date) {
      return new Response(
        JSON.stringify({ error: "Missing 'date' parameter. Use format: YYYY-MM-DD" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return new Response(
        JSON.stringify({ error: "Invalid date format. Use: YYYY-MM-DD" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Query gospel_daily with all related data
    const { data: gospelDaily, error } = await supabaseClient
      .from("gospel_daily")
      .select(`
        id,
        date,
        gospel_id,
        saints,
        liturgical_season,
        sacred_texts,
        gospel:gospels(id, reference, evangelist, text),
        comment_sections(id, section_type, content),
        media(id, type, url, alt_text)
      `)
      .eq("date", date)
      .maybeSingle();

    if (error || !gospelDaily) {
      return new Response(
        JSON.stringify({
          error: "Gospel not found for this date",
          date: date,
          hint: "Make sure the content is published"
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract comments by type
    const sections = gospelDaily.comment_sections || [];
    const mainComment = sections.find((c: any) => c.section_type === "main");
    const reflectionComment = sections.find(
      (c: any) => c.section_type === "reflection" || c.section_type === "application"
    );

    // Extract media by type
    const mediaItems = gospelDaily.media || [];
    const videos = mediaItems
      .filter((m: any) => m.type === "video")
      .map((m: any) => m.url);
    const images = mediaItems
      .filter((m: any) => m.type === "image")
      .map((m: any) => ({ url: m.url, alt: m.alt_text }));

    // Get related entries (same gospel, different dates)
    const { data: relatedData } = await supabaseClient
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

    const related = (relatedData || []).map((entry: any) => {
      const entryMain = entry.comment_sections?.find(
        (c: any) => c.section_type === "main"
      );
      const entryVideos = (entry.media || [])
        .filter((m: any) => m.type === "video")
        .map((m: any) => m.url);
      return {
        id: entry.id,
        date: entry.date,
        saints: entry.saints || "",
        excerpt: entryMain?.content ? truncate(entryMain.content, 150) : "",
        videos: entryVideos,
      };
    });

    // Collect all videos (today + related)
    const allVideos = [
      ...videos,
      ...related.flatMap((r: any) => r.videos || [])
    ];

    // Build response based on version
    let response: GospelDailyResponseV1 | GospelDailyResponseV2;

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
          comment: r.excerpt, // In v1 we only had this
          extra: "",
        })),
        videos: videos,
      } as GospelDailyResponseV1;
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
        related,
      } as GospelDailyResponseV2;
    }

    return new Response(JSON.stringify(response), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300", // 5 min cache
        "X-API-Version": version,
      },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", message: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
