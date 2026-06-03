// FUNCTION-READY (deploy via dashboard Supabase): versione flat e self-contained di `locations`.
// IT è la lingua canonica; le altre lingue sono tradotte al volo (DeepL) con cache,
// mantenendo la stessa forma di risposta. Override: se per uno slug esistono già
// riga/eventi tradotti a mano, quelli vengono serviti senza traduzione.
// Secret richiesti: DEEPL_API_KEY (free => endpoint api-free; per DeepL Pro imposta DEEPL_API_URL).
// SUPABASE_SERVICE_ROLE_KEY è già iniettato di default da Supabase nelle edge function.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPPORTED = new Set(["it", "en", "es", "fr", "pl", "pt"]);

const HEADER_TITLE = {
  it: "Attività e missioni",
  en: "Activities and missions",
  es: "Actividades y misiones",
  fr: "Activités et missions",
  pl: "Aktywności i misje",
  pt: "Atividades e missões",
};
const headerTitleFor = (lang) => HEADER_TITLE[lang] || HEADER_TITLE.it;

// ─── Traduzione + cache ──────────────────────────────────────────────────────
async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function makeDeepLClient(apiKey, endpoint) {
  const url = endpoint || "https://api-free.deepl.com/v2/translate";
  return async (texts, lang, isHtml) => {
    if (texts.length === 0) return [];
    const params = new URLSearchParams();
    for (const t of texts) params.append("text", t);
    params.append("target_lang", lang.toUpperCase());
    if (isHtml) params.append("tag_handling", "html");
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `DeepL-Auth-Key ${apiKey}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });
    if (!res.ok) throw new Error(`DeepL ${res.status}: ${await res.text()}`);
    const json = await res.json();
    return (json.translations || []).map((t) => t.text);
  };
}

// inputs: [{ text, isHtml }]; deps: { getCached, setCached, deepl }. Ritorna i testi nell'ordine.
async function translateTexts(inputs, lang, deps) {
  if (lang === "it") return inputs.map((i) => i.text);
  const hashes = await Promise.all(inputs.map((i) => (i.text.trim() === "" ? Promise.resolve("") : sha256(i.text))));
  const need = new Map();
  inputs.forEach((inp, i) => { if (hashes[i] !== "") need.set(hashes[i], inp); });
  const allHashes = [...need.keys()];
  const cached = allHashes.length ? await deps.getCached(allHashes, lang) : {};
  const missHashes = allHashes.filter((h) => cached[h] === undefined);
  const result = { ...cached };
  const plain = [];
  const html = [];
  for (const h of missHashes) {
    const inp = need.get(h);
    (inp.isHtml ? html : plain).push({ hash: h, text: inp.text });
  }
  if (plain.length) {
    const out = await deps.deepl(plain.map((p) => p.text), lang, false);
    plain.forEach((p, i) => { result[p.hash] = out[i] ?? p.text; });
  }
  if (html.length) {
    const out = await deps.deepl(html.map((p) => p.text), lang, true);
    html.forEach((p, i) => { result[p.hash] = out[i] ?? p.text; });
  }
  if (missHashes.length) {
    await deps.setCached(missHashes.map((h) => ({ source_hash: h, lang, translated: result[h] })));
  }
  return inputs.map((inp, i) => (hashes[i] === "" ? inp.text : (result[hashes[i]] ?? inp.text)));
}

// ─── Shape (identico al deployato, con headerTitle parametrico) ───────────────
function imageUrlValue(images) {
  if (!images || images.length === 0) return null;
  return images.length === 1 ? images[0] : images;
}

function shapeLocations(rows, events = [], headerTitle = "Attività e missioni") {
  const groups = (rows || []).map((loc) => {
    const slug = loc.slug;
    const locEvents = (events || []).filter((e) => e.location_slug === slug);
    const flyers = locEvents.filter((e) => e.type === "flyer" && e.image)
      .slice().sort((a, b) => a.position - b.position).map((e) => e.image);
    const infos = (loc.location_info || []).slice().sort((a, b) => a.position - b.position);

    const sections = infos.map((info, idx) => ({
      title: info.title,
      articles: info.body ? [info.body] : [],
      image: { url: (idx === 0 && flyers.length > 0) ? imageUrlValue(flyers) : imageUrlValue(info.images), align: "right" },
    }));

    if (infos.length === 0 && flyers.length) {
      sections.push({ title: null, articles: [], image: { url: imageUrlValue(flyers), align: "right" } });
    }

    locEvents.filter((e) => e.type === "text")
      .slice().sort((a, b) => a.position - b.position)
      .forEach((e) => {
        const d = e.event_date ? ` (${e.event_date})` : "";
        sections.push({ title: (e.title || "") + d, articles: e.body ? [e.body] : [], image: { url: null, align: "right" } });
      });

    return {
      key: slug, title: loc.name,
      address: loc.address ?? null, latitude: loc.latitude ?? null, longitude: loc.longitude ?? null,
      phone: loc.phone ?? null, city: loc.city ?? null, emails: loc.emails ?? [],
      sections,
    };
  });
  return {
    header: { title: groups.length ? headerTitle : "" },
    main: { caption: rows && rows[0] ? (rows[0].intro || "") : "" },
    groups,
  };
}

// ─── Handler ──────────────────────────────────────────────────────────────────
const LOC_COLUMNS = `id, slug, name, lang, address, latitude, longitude, cover_image, intro, position, phone, city, emails,
  location_info ( id, title, body, images, position )`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body, status = 200) => new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=300" },
  });

  try {
    const url = new URL(req.url);
    const reqLang = url.searchParams.get("lang") || "it";
    // Whitelist: sanifica l'input (no injection nel filtro) e scarta lingue ignote.
    const lang = SUPPORTED.has(reqLang) ? reqLang : "it";

    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "");

    // Fast-path: italiano = nessuna traduzione (comportamento storico).
    if (lang === "it") {
      const { data, error } = await supabase.from("locations").select(LOC_COLUMNS)
        .eq("lang", "it").eq("is_published", true).order("position", { ascending: true });
      if (error) return json({ error: error.message }, 500);
      const { data: events } = await supabase.from("events").select("*")
        .or("lang.is.null,lang.eq.it").eq("is_published", true).order("position", { ascending: true });
      return json(shapeLocations(data ?? [], events ?? [], headerTitleFor("it")));
    }

    // Lingua xx: IT canonica + override + traduzione.
    const [itRes, xxRes, evRes] = await Promise.all([
      supabase.from("locations").select(LOC_COLUMNS).eq("lang", "it").eq("is_published", true).order("position", { ascending: true }),
      supabase.from("locations").select(LOC_COLUMNS).eq("lang", lang).eq("is_published", true),
      supabase.from("events").select("*").or(`lang.is.null,lang.eq.it,lang.eq.${lang}`).eq("is_published", true).order("position", { ascending: true }),
    ]);
    if (itRes.error) return json({ error: itRes.error.message }, 500);

    const itRows = itRes.data ?? [];
    const xxRows = xxRes.data ?? [];
    const allEvents = evRes.data ?? [];

    // Righe: override xx se presente, altrimenti IT (da tradurre).
    const bySlug = new Map();
    const toTranslate = new Set();
    for (const r of itRows) { bySlug.set(r.slug, r); toTranslate.add(r.slug); }
    for (const r of xxRows) { bySlug.set(r.slug, r); toTranslate.delete(r.slug); }
    const rows = [...bySlug.values()].sort((a, b) => a.position - b.position);

    // Eventi: volantini invariati; eventi testuali = set xx se esiste, altrimenti set IT (da tradurre).
    const flyers = allEvents.filter((e) => e.type !== "text");
    const itText = allEvents.filter((e) => e.type === "text" && e.lang === "it");
    const xxText = allEvents.filter((e) => e.type === "text" && e.lang === lang);
    const xxTextSlugs = new Set(xxText.map((e) => e.location_slug));
    const itTextToUse = itText.filter((e) => !xxTextSlugs.has(e.location_slug));
    const translateEventIds = new Set(itTextToUse.map((e) => e.id));
    const finalEvents = [...flyers, ...xxText, ...itTextToUse].sort((a, b) => a.position - b.position);

    // Traduzione dei frammenti mancanti (fallback al testo IT se DeepL/cache falliscono).
    const apiKey = Deno.env.get("DEEPL_API_KEY");
    if (apiKey) {
      try {
        const cacheClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
        const deps = {
          getCached: async (hashes, l) => {
            const { data } = await cacheClient.from("translations_cache").select("source_hash, translated")
              .in("source_hash", hashes).eq("lang", l);
            const map = {};
            for (const r of (data ?? [])) map[r.source_hash] = r.translated;
            return map;
          },
          setCached: async (entries) => {
            if (entries.length) await cacheClient.from("translations_cache").upsert(entries, { onConflict: "source_hash,lang" });
          },
          deepl: makeDeepLClient(apiKey, Deno.env.get("DEEPL_API_URL")),
        };

        const jobs = [];
        for (const row of rows) {
          if (!toTranslate.has(row.slug)) continue;
          if (row.name) jobs.push({ input: { text: row.name, isHtml: false }, set: (v) => { row.name = v; } });
          if (row.intro) jobs.push({ input: { text: row.intro, isHtml: false }, set: (v) => { row.intro = v; } });
          for (const info of (row.location_info || [])) {
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
        console.error("Traduzione fallita, servo il testo IT:", e?.message || e);
      }
    }

    return json(shapeLocations(rows, finalEvents, headerTitleFor(lang)));
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal server error", message: String(err?.message || err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
