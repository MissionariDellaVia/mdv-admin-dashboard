// Traduzione automatica con cache, usata dall'edge `locations`.
// Nessun import da URL: usa solo `fetch` e `crypto.subtle` globali, così il
// modulo è importabile e testabile anche fuori da Deno (Vitest, ambiente Node).

export interface TextInput {
  text: string;
  isHtml: boolean;
}

export interface TranslateDeps {
  /** Legge dalla cache: ritorna una mappa source_hash -> testo tradotto. */
  getCached(hashes: string[], lang: string): Promise<Record<string, string>>;
  /** Scrive in cache le nuove traduzioni. */
  setCached(
    entries: { source_hash: string; lang: string; translated: string }[],
  ): Promise<void>;
  /** Traduce un batch di testi nella lingua target. */
  deepl(texts: string[], lang: string, isHtml: boolean): Promise<string[]>;
}

// Etichette UI statiche (header.title della risposta locations): niente costo API.
const HEADER_TITLE: Record<string, string> = {
  it: 'Attività e missioni',
  en: 'Activities and missions',
  es: 'Actividades y misiones',
  fr: 'Activités et missions',
  pl: 'Aktywności i misje',
  pt: 'Atividades e missões',
};

export function headerTitleFor(lang: string): string {
  return HEADER_TITLE[lang] ?? HEADER_TITLE.it;
}

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Traduce `inputs` in `lang` usando cache + DeepL (via deps).
 * - Stringhe vuote passano invariate.
 * - `lang === 'it'` => no-op (ritorna i testi originali).
 * - I miss di cache vengono tradotti in batch (split plain/HTML) e persistiti.
 * Ritorna i testi nello stesso ordine di `inputs`.
 */
export async function translateTexts(
  inputs: TextInput[],
  lang: string,
  deps: TranslateDeps,
): Promise<string[]> {
  if (lang === 'it') return inputs.map((i) => i.text);

  const hashes = await Promise.all(
    inputs.map((i) => (i.text.trim() === '' ? Promise.resolve('') : sha256(i.text))),
  );

  // Mappa hash -> input (unici, non vuoti).
  const need = new Map<string, TextInput>();
  inputs.forEach((inp, i) => {
    if (hashes[i] !== '') need.set(hashes[i], inp);
  });

  const allHashes = [...need.keys()];
  const cached = allHashes.length ? await deps.getCached(allHashes, lang) : {};

  const missHashes = allHashes.filter((h) => cached[h] === undefined);
  const result: Record<string, string> = { ...cached };

  const plain: { hash: string; text: string }[] = [];
  const html: { hash: string; text: string }[] = [];
  for (const h of missHashes) {
    const inp = need.get(h);
    if (!inp) continue;
    (inp.isHtml ? html : plain).push({ hash: h, text: inp.text });
  }

  if (plain.length) {
    const out = await deps.deepl(plain.map((p) => p.text), lang, false);
    plain.forEach((p, i) => {
      result[p.hash] = out[i] ?? p.text;
    });
  }
  if (html.length) {
    const out = await deps.deepl(html.map((p) => p.text), lang, true);
    html.forEach((p, i) => {
      result[p.hash] = out[i] ?? p.text;
    });
  }

  if (missHashes.length) {
    await deps.setCached(
      missHashes.map((h) => ({ source_hash: h, lang, translated: result[h] })),
    );
  }

  return inputs.map((inp, i) => (hashes[i] === '' ? inp.text : result[hashes[i]] ?? inp.text));
}

/** Client DeepL basato su `fetch` (usato dall'edge; nei test si inietta un mock). */
export function makeDeepLClient(
  apiKey: string,
  endpoint = 'https://api-free.deepl.com/v2/translate',
) {
  return async (texts: string[], lang: string, isHtml: boolean): Promise<string[]> => {
    if (texts.length === 0) return [];
    const params = new URLSearchParams();
    for (const t of texts) params.append('text', t);
    params.append('target_lang', lang.toUpperCase());
    if (isHtml) params.append('tag_handling', 'html');
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `DeepL-Auth-Key ${apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });
    if (!res.ok) throw new Error(`DeepL ${res.status}: ${await res.text()}`);
    const json = (await res.json()) as { translations?: { text: string }[] };
    return (json.translations ?? []).map((t) => t.text);
  };
}
