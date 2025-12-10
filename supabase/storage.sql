-- MDV Admin Storage Configuration
-- Eseguire DOPO rls-policies.sql

-- ============================================
-- CREATE STORAGE BUCKET
-- ============================================

-- Crea il bucket per i media del vangelo
INSERT INTO storage.buckets (id, name, public)
VALUES ('gospel-media', 'gospel-media', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- STORAGE POLICIES
-- ============================================

-- Policy per lettura pubblica dei file
CREATE POLICY "Public read access for gospel-media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'gospel-media');

-- Policy per upload da utenti autenticati
CREATE POLICY "Authenticated users can upload to gospel-media"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'gospel-media'
    AND auth.role() = 'authenticated'
  );

-- Policy per aggiornamento da utenti autenticati
CREATE POLICY "Authenticated users can update gospel-media"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'gospel-media'
    AND auth.role() = 'authenticated'
  );

-- Policy per eliminazione da utenti autenticati
CREATE POLICY "Authenticated users can delete from gospel-media"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'gospel-media'
    AND auth.role() = 'authenticated'
  );
