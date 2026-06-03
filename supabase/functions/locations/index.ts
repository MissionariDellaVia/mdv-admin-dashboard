// Locations API - GET /locations?lang=it  (lettura pubblica per webapp + mobile)
// IT è la lingua canonica; le altre lingue vengono tradotte al volo (DeepL) con
// cache, mantenendo la stessa forma di risposta. Se per uno slug esiste già una
// riga/evento tradotti a mano, quelli fanno da override (nessuna traduzione).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { shapeLocations } from "../_shared/locations-shape.ts";
import { translateTexts, headerTitleFor, makeDeepLClient } from "../_shared/translate.ts";
import type { TranslateDeps, TextInput } from "../_shared/translate.ts";

const SUPPORTED = new Set(["it", "en", "es", "fr", "pl", "pt"]);

const LOC_COLUMNS = `id, slug, name, lang, address, latitude, longitude, cover_image, intro, position, phone, city, emails,
  location_info ( id, title, body, images, position )`;

interface InfoRow { id: number; title: string | null; body: string; images: string[] | null; position: number; }
interface LocRow {
  id: number; slug: string; name: string; lang: string;
  address: string | null; latitude: number | null; longitude: number | null;
  cover_image: string | null; intro: string | null; position: number;
  phone: string | null; city: string | null;
  emails: { type: string; email: string }[] | null;
  location_info: InfoRow[] | null;
}
interface EvRow {
  id: number; location_slug: string; lang: string | null; type: string;
  title: string | null; body: string | null; image: string | null;
  event_date: string | null; position: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=300" },
    });

  try {
    const url = new URL(req.url);
    const reqLang = url.searchParams.get("lang") || "it";
    // Whitelist: sanifica l'input (no injection nel filtro) e scarta lingue ignote.
    const lang = SUPPORTED.has(reqLang) ? reqLang : "it";

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    );

    // ── Fast-path: italiano = nessuna traduzione (comportamento storico) ──
    if (lang === "it") {
      const { data, error } = await supabase
        .from("locations").select(LOC_COLUMNS)
        .eq("lang", "it").eq("is_published", true)
        .order("position", { ascending: true });
      if (error) return json({ error: error.message }, 500);
      const { data: events } = await supabase
        .from("events").select("*")
        .or("lang.is.null,lang.eq.it").eq("is_published", true)
        .order("position", { ascending: true });
      return json(shapeLocations((data ?? []) as LocRow[], (events ?? []) as EvRow[], headerTitleFor("it")));
    }

    // ── Lingua xx: IT canonica + override + traduzione ──
    const [itRes, xxRes, evRes] = await Promise.all([
      supabase.from("locations").select(LOC_COLUMNS).eq("lang", "it").eq("is_published", true).order("position", { ascending: true }),
      supabase.from("locations").select(LOC_COLUMNS).eq("lang", lang).eq("is_published", true),
      supabase.from("events").select("*").or(`lang.is.null,lang.eq.it,lang.eq.${lang}`).eq("is_published", true).order("position", { ascending: true }),
    ]);
    if (itRes.error) return json({ error: itRes.error.message }, 500);

    const itRows = (itRes.data ?? []) as LocRow[];
    const xxRows = (xxRes.data ?? []) as LocRow[];
    const allEvents = (evRes.data ?? []) as EvRow[];

    // Righe da servire: override xx se presente, altrimenti IT (da tradurre).
    const bySlug = new Map<string, LocRow>();
    const toTranslate = new Set<string>();
    for (const r of itRows) { bySlug.set(r.slug, r); toTranslate.add(r.slug); }
    for (const r of xxRows) { bySlug.set(r.slug, r); toTranslate.delete(r.slug); }
    const rows = [...bySlug.values()].sort((a, b) => a.position - b.position);

    // Eventi: volantini (lang null) invariati; eventi testuali = set xx se esiste
    // per lo slug, altrimenti set IT (da tradurre).
    const flyers = allEvents.filter((e) => e.type !== "text");
    const itText = allEvents.filter((e) => e.type === "text" && e.lang === "it");
    const xxText = allEvents.filter((e) => e.type === "text" && e.lang === lang);
    const xxTextSlugs = new Set(xxText.map((e) => e.location_slug));
    const itTextToUse = itText.filter((e) => !xxTextSlugs.has(e.location_slug));
    const translateEventIds = new Set(itTextToUse.map((e) => e.id));
    const finalEvents = [...flyers, ...xxText, ...itTextToUse].sort((a, b) => a.position - b.position);

    // ── Traduzione dei frammenti mancanti (fallback al testo IT se fallisce) ──
    const apiKey = Deno.env.get("DEEPL_API_KEY");
    if (apiKey) {
      try {
        const cacheClient = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        );
        const deps: TranslateDeps = {
          getCached: async (hashes, l) => {
            const { data } = await cacheClient
              .from("translations_cache").select("source_hash, translated")
              .in("source_hash", hashes).eq("lang", l);
            const map: Record<string, string> = {};
            for (const r of (data ?? []) as { source_hash: string; translated: string }[]) {
              map[r.source_hash] = r.translated;
            }
            return map;
          },
          setCached: async (entries) => {
            if (entries.length) {
              await cacheClient.from("translations_cache").upsert(entries, { onConflict: "source_hash,lang" });
            }
          },
          deepl: makeDeepLClient(apiKey, Deno.env.get("DEEPL_API_URL") || undefined),
        };

        const jobs: { input: TextInput; set: (v: string) => void }[] = [];
        for (const row of rows) {
          if (!toTranslate.has(row.slug)) continue;
          if (row.name) jobs.push({ input: { text: row.name, isHtml: false }, set: (v) => { row.name = v; } });
          if (row.intro) jobs.push({ input: { text: row.intro, isHtml: false }, set: (v) => { row.intro = v; } });
          for (const info of row.location_info ?? []) {
            if (info.title) jobs.push({ input: { text: info.title, isHtml: false }, set: (v) => { info.title = v; } });
            if (info.body) jobs.push({ input: { text: info.body, isHtml: true }, set: (v) => { info.body = v; } });
          }
        }
        for (const ev of finalEvents) {
          if (!translateEventIds.has(ev.id)) continue;
          if (ev.title) jobs.push({ input: { text: ev.title, isHtml: false }, set: (v) => { ev.title = v; } });
          if (ev.body) jobs.push({ input: { text: ev.body, isHtml: true }, set: (v) => { ev.body = v; } });
        }

        if (jobs.length) {
          const translated = await translateTexts(jobs.map((j) => j.input), lang, deps);
          translated.forEach((t, i) => jobs[i].set(t));
        }
      } catch (e) {
        console.error("Traduzione fallita, servo il testo IT:", (e as Error).message);
      }
    }

    return json(shapeLocations(rows, finalEvents, headerTitleFor(lang)));
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal server error", message: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
