# Design — Traduzione automatica location (edge-only, IT canonica)

**Data:** 2026-06-03
**Branch:** develop
**Autore:** alessandro.macri (con Claude)

## Obiettivo

Smettere di gestire il multilingua a DB/admin per le location. Fonte di verità
unica = italiano (IT). L'edge function `locations` traduce **a richiesta** verso
la lingua chiesta, restituendo la **stessa identica forma** della risposta
attuale. Zero regressioni strutturali e di reliability.

## Architettura: translate-on-read

- `lang=it` → percorso attuale identico (nessuna traduzione).
- `lang=xx` → IT canonica tradotta al volo, con **override**: se esiste già una
  riga/evento tradotti a mano per `xx`, si servono così come sono.
- Provider: **DeepL** (`tag_handling=html` per preservare i tag Tiptap).
- Cache: tabella `translations_cache` con chiave `(source_hash, lang)`.

## Componenti

### a) Migration `supabase/migrations/20260603_translations_cache.sql`
```sql
CREATE TABLE IF NOT EXISTS translations_cache (
  source_hash TEXT NOT NULL,
  lang        TEXT NOT NULL,
  translated  TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (source_hash, lang)
);
ALTER TABLE translations_cache ENABLE ROW LEVEL SECURITY;
-- Nessuna policy pubblica: l'edge accede con service-role (bypassa RLS).
```
`source_hash` = sha256 del testo IT sorgente. Se l'IT cambia → nuovo hash →
cache miss → ritraduce. Voci vecchie restano orfane (innocue).

### b) `supabase/functions/_shared/translate.ts` (nuovo, Node-importabile)
- Nessun import da URL; usa solo `fetch` e `crypto.subtle` globali → testabile
  con Vitest.
- `translateTexts(inputs, lang, deps)`: pura orchestrazione (hash, lookup cache,
  batch dei miss split plain/HTML, persist, rimappa output). Dipendenze iniettate
  (`getCached`, `setCached`, `deepl`).
- `makeDeepLClient(apiKey)`: caller DeepL via `fetch`.
- `headerTitleFor(lang)`: mappa statica localizzata per `header.title`
  ("Attività e missioni") — niente costo API.

### c) `supabase/functions/locations/index.ts` (modifica)
- Fast-path `lang=it` invariato.
- `lang=xx`: fetch righe IT + righe xx (override) + eventi (null/it/xx).
  Per slug: override xx se presente, altrimenti riga IT da tradurre. Eventi
  testuali: set xx se presente, altrimenti set IT da tradurre. Volantini invariati.
- Raccoglie i frammenti da tradurre (name, intro, info.title/body, event
  title/body), chiama `translateTexts`, rimappa, poi `shapeLocations(rows,
  events, headerTitleFor(lang))`.
- **Fallback reliability**: se DeepL/cache falliscono → try/catch → serve il
  testo IT non tradotto con 200 (mai 500 per colpa della traduzione).
- Client service-role solo per la cache (`SUPABASE_SERVICE_ROLE_KEY`).

### d) `supabase/functions/_shared/locations-shape.ts` (modifica minima)
- `shapeLocations(rows, events, headerTitle = 'Attività e missioni')`: terzo
  parametro opzionale, default = comportamento attuale (no regressioni sui
  chiamanti).

### e) Admin IT-only `src/pages/locations/LocationEdit.tsx` (modifica)
- Rimuove selettore lingua e copia-tra-lingue; `lang` fisso a `'it'`.
- Restano: Tiptap, edit/riordino eventi, immagini info, avviso modifiche non
  salvate, contatti email.
- Gli eventi testuali creati avranno `lang='it'`.
- `LocationList.tsx` resta invariato (i badge lingua riflettono i dati reali,
  inclusi eventuali override — informativi, non gestione).

## Cosa si traduce / cosa NO
- Traduce: `name`, `intro`, `location_info.title`, `location_info.body` (HTML),
  evento `title`, evento `body` (HTML), `header.title` (mappa statica).
- MAI: slug, address, phone, emails, lat/lng, URL immagini.

## Config (Supabase Edge, da impostare prima del deploy)
- `DEEPL_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- (opzionale) `DEEPL_API_URL` per endpoint pro vs free.

## Regressioni: perché zero
| Caso | Prima | Dopo |
|------|-------|------|
| lang=it | IT | identico (no path traduzione) |
| lang=xx con riga manuale | xx | identico (override) |
| lang=xx senza riga | vuoto | tradotto (empty→popolato) |
| volantini | invariati | invariati |
| forma JSON | shape X | stessa shape X |
| DeepL down | n/a | fallback a testo IT, 200 |

## Testing
- Vitest su `translate.ts`: cache hit/miss, batch, split plain/HTML, passthrough
  stringhe vuote, no-op per `lang=it`. DeepL e cache mockati (deps iniettate).
- Manuale: `?lang=it` invariato; `?lang=fr` su slug solo-IT → tradotto; seconda
  chiamata → da cache.
