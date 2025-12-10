-- MDV Admin Database Schema
-- Eseguire questo script nel SQL Editor di Supabase

-- ============================================
-- ENUM TYPES
-- ============================================

CREATE TYPE evangelist AS ENUM ('Matteo', 'Marco', 'Luca', 'Giovanni');
CREATE TYPE section_type AS ENUM ('intro', 'main', 'reflection', 'application', 'prayer', 'conclusion');
CREATE TYPE content_format AS ENUM ('html', 'markdown', 'plain');
CREATE TYPE media_type AS ENUM ('image', 'video', 'audio');
CREATE TYPE liturgical_season AS ENUM ('Avvento', 'Natale', 'Quaresima', 'Pasqua', 'Ordinario');

-- ============================================
-- TABLES
-- ============================================

-- Gospels: Testi dei Vangeli (immutabili)
CREATE TABLE gospels (
  id BIGSERIAL PRIMARY KEY,
  reference VARCHAR(100) NOT NULL,
  evangelist evangelist NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gospel Daily: Contenuto giornaliero Via del Vangelo
CREATE TABLE gospel_daily (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  gospel_id BIGINT NOT NULL REFERENCES gospels(id) ON DELETE RESTRICT,
  saints VARCHAR(500),
  liturgical_season VARCHAR(50),
  sacred_texts TEXT,
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON COLUMN gospel_daily.sacred_texts IS 'Riferimenti ai testi sacri del giorno (es. Is 40,1-11; Sal 84; 2Pt 3,8-14)';

-- Comment Sections: Sezioni di commento per gospel_daily
CREATE TABLE comment_sections (
  id BIGSERIAL PRIMARY KEY,
  gospel_daily_id BIGINT NOT NULL REFERENCES gospel_daily(id) ON DELETE CASCADE,
  section_type section_type NOT NULL,
  title VARCHAR(255),
  content TEXT NOT NULL,
  content_format content_format DEFAULT 'html',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Media: File multimediali allegati
CREATE TABLE media (
  id BIGSERIAL PRIMARY KEY,
  gospel_daily_id BIGINT NOT NULL REFERENCES gospel_daily(id) ON DELETE CASCADE,
  type media_type NOT NULL,
  url TEXT NOT NULL,
  storage_path TEXT,
  title VARCHAR(255),
  alt_text VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seeds: Versetti per funzione semino random
CREATE TABLE seeds (
  id BIGSERIAL PRIMARY KEY,
  verse_text TEXT NOT NULL,
  reference VARCHAR(100),
  category VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_gospel_daily_date ON gospel_daily(date);
CREATE INDEX idx_gospel_daily_published ON gospel_daily(is_published);
CREATE INDEX idx_comment_sections_daily ON comment_sections(gospel_daily_id);
CREATE INDEX idx_comment_sections_order ON comment_sections(gospel_daily_id, sort_order);
CREATE INDEX idx_media_daily ON media(gospel_daily_id);
CREATE INDEX idx_seeds_active ON seeds(is_active);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Funzione per ottenere un seed random attivo
CREATE OR REPLACE FUNCTION get_random_seed()
RETURNS SETOF seeds AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM seeds
  WHERE is_active = TRUE
  ORDER BY RANDOM()
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Funzione per aggiornare updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_gospels_updated_at
  BEFORE UPDATE ON gospels
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gospel_daily_updated_at
  BEFORE UPDATE ON gospel_daily
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comment_sections_updated_at
  BEFORE UPDATE ON comment_sections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seeds_updated_at
  BEFORE UPDATE ON seeds
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
