-- MDV Admin RLS Policies
-- Eseguire DOPO schema.sql

-- ============================================
-- ENABLE RLS
-- ============================================

ALTER TABLE gospels ENABLE ROW LEVEL SECURITY;
ALTER TABLE gospel_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE media ENABLE ROW LEVEL SECURITY;
ALTER TABLE seeds ENABLE ROW LEVEL SECURITY;

-- ============================================
-- GOSPELS POLICIES
-- ============================================

-- Lettura pubblica
CREATE POLICY "Gospels are viewable by everyone"
  ON gospels FOR SELECT
  USING (true);

-- Scrittura solo autenticati
CREATE POLICY "Gospels are insertable by authenticated users"
  ON gospels FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Gospels are updatable by authenticated users"
  ON gospels FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Gospels are deletable by authenticated users"
  ON gospels FOR DELETE
  USING (auth.role() = 'authenticated');

-- ============================================
-- GOSPEL_DAILY POLICIES
-- ============================================

-- Lettura pubblica (solo pubblicati per anonimi)
CREATE POLICY "Published gospel_daily are viewable by everyone"
  ON gospel_daily FOR SELECT
  USING (is_published = true OR auth.role() = 'authenticated');

-- Scrittura solo autenticati
CREATE POLICY "Gospel_daily are insertable by authenticated users"
  ON gospel_daily FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Gospel_daily are updatable by authenticated users"
  ON gospel_daily FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Gospel_daily are deletable by authenticated users"
  ON gospel_daily FOR DELETE
  USING (auth.role() = 'authenticated');

-- ============================================
-- COMMENT_SECTIONS POLICIES
-- ============================================

-- Lettura pubblica (attraverso gospel_daily)
CREATE POLICY "Comment sections are viewable by everyone"
  ON comment_sections FOR SELECT
  USING (true);

-- Scrittura solo autenticati
CREATE POLICY "Comment sections are insertable by authenticated users"
  ON comment_sections FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Comment sections are updatable by authenticated users"
  ON comment_sections FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Comment sections are deletable by authenticated users"
  ON comment_sections FOR DELETE
  USING (auth.role() = 'authenticated');

-- ============================================
-- MEDIA POLICIES
-- ============================================

-- Lettura pubblica
CREATE POLICY "Media are viewable by everyone"
  ON media FOR SELECT
  USING (true);

-- Scrittura solo autenticati
CREATE POLICY "Media are insertable by authenticated users"
  ON media FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Media are updatable by authenticated users"
  ON media FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Media are deletable by authenticated users"
  ON media FOR DELETE
  USING (auth.role() = 'authenticated');

-- ============================================
-- SEEDS POLICIES
-- ============================================

-- Lettura pubblica (solo attivi per anonimi)
CREATE POLICY "Active seeds are viewable by everyone"
  ON seeds FOR SELECT
  USING (is_active = true OR auth.role() = 'authenticated');

-- Scrittura solo autenticati
CREATE POLICY "Seeds are insertable by authenticated users"
  ON seeds FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Seeds are updatable by authenticated users"
  ON seeds FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Seeds are deletable by authenticated users"
  ON seeds FOR DELETE
  USING (auth.role() = 'authenticated');
