-- Cache delle traduzioni automatiche (DeepL) usata dall'edge function `locations`.
-- Chiave per hash del testo IT sorgente: se l'italiano cambia, cambia l'hash e
-- la voce viene semplicemente ritradotta (le vecchie restano orfane, innocue).
CREATE TABLE IF NOT EXISTS translations_cache (
  source_hash TEXT NOT NULL,
  lang        TEXT NOT NULL,
  translated  TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (source_hash, lang)
);

COMMENT ON TABLE translations_cache IS 'Cache traduzioni DeepL per l''edge locations; chiave (sha256 testo IT, lang)';

ALTER TABLE translations_cache ENABLE ROW LEVEL SECURITY;
-- Nessuna policy pubblica: l'edge function accede con la service-role key, che
-- bypassa RLS. La cache non è quindi né leggibile né scrivibile da anon/auth.
