-- Ruoli collaboratori: profiles + mappa luoghi + helper RLS. Idempotente.
-- Eseguire nel SQL Editor di Supabase (o supabase db push).

CREATE TABLE IF NOT EXISTS profiles (
  id                   UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role                 TEXT NOT NULL DEFAULT 'collaborator'
                         CHECK (role IN ('admin','collaborator')),
  email                TEXT,
  must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS location_editors (
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_slug VARCHAR(120) NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, location_slug)
);

CREATE INDEX IF NOT EXISTS idx_location_editors_user ON location_editors(user_id);

-- Helper usati dalle RLS. SECURITY DEFINER: evitano ricorsione di RLS su profiles.
CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN
  LANGUAGE sql SECURITY DEFINER STABLE
  SET search_path = ''
  AS $$
    SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
  $$;

CREATE OR REPLACE FUNCTION can_edit_location(slug TEXT) RETURNS BOOLEAN
  LANGUAGE sql SECURITY DEFINER STABLE
  SET search_path = ''
  AS $$
    SELECT public.is_admin()
        OR EXISTS (SELECT 1 FROM public.location_editors
                   WHERE user_id = auth.uid() AND location_slug = slug);
  $$;

-- Il collaboratore azzera il proprio flag al primo cambio password (no escalation:
-- non tocca direttamente la tabella, quindi non può cambiarsi il ruolo).
CREATE OR REPLACE FUNCTION complete_password_change() RETURNS VOID
  LANGUAGE sql SECURITY DEFINER
  SET search_path = ''
  AS $$
    UPDATE public.profiles SET must_change_password = false WHERE id = auth.uid();
  $$;

-- ANTI-REGRESSIONE: tutti gli utenti già esistenti diventano admin.
INSERT INTO profiles (id, role, email)
  SELECT id, 'admin', email FROM auth.users
  ON CONFLICT (id) DO NOTHING;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_editors ENABLE ROW LEVEL SECURITY;

-- profiles: ognuno legge la propria riga; gli admin leggono tutto; scrive solo admin.
DROP POLICY IF EXISTS "profiles self read" ON profiles;
CREATE POLICY "profiles self read" ON profiles FOR SELECT
  USING (id = auth.uid() OR is_admin());
DROP POLICY IF EXISTS "profiles admin write" ON profiles;
CREATE POLICY "profiles admin write" ON profiles FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

-- location_editors: il collaboratore legge le proprie righe; gli admin tutto; scrive solo admin.
DROP POLICY IF EXISTS "location_editors self read" ON location_editors;
CREATE POLICY "location_editors self read" ON location_editors FOR SELECT
  USING (user_id = auth.uid() OR is_admin());
DROP POLICY IF EXISTS "location_editors admin write" ON location_editors;
CREATE POLICY "location_editors admin write" ON location_editors FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());
