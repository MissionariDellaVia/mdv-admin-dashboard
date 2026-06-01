-- Locations domain: luoghi MDV con info ricorrenti (orari messe, confessioni…)
-- Eseguire nel SQL Editor di Supabase (o via supabase db push)

CREATE TABLE locations (
  id BIGSERIAL PRIMARY KEY,
  slug VARCHAR(120) NOT NULL,
  name VARCHAR(255) NOT NULL,
  lang VARCHAR(5) NOT NULL DEFAULT 'it',
  address VARCHAR(500),
  latitude NUMERIC(9,6),
  longitude NUMERIC(9,6),
  cover_image TEXT,
  intro TEXT,
  position INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (slug, lang)
);

COMMENT ON COLUMN locations.intro IS 'Testo introduttivo (era attivita.main.caption)';
COMMENT ON COLUMN locations.latitude IS 'Predisposto per notifiche push geolocalizzate future';

CREATE TABLE location_info (
  id BIGSERIAL PRIMARY KEY,
  location_id BIGINT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  title VARCHAR(255),
  body TEXT NOT NULL DEFAULT '',
  images TEXT[] NOT NULL DEFAULT '{}',
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON COLUMN location_info.body IS 'Contenuto HTML (era sections.articles[])';
COMMENT ON COLUMN location_info.images IS 'URL pubblici Storage per il carousel della sezione';

CREATE INDEX idx_locations_lang ON locations(lang);
CREATE INDEX idx_locations_published ON locations(is_published);
CREATE INDEX idx_locations_position ON locations(lang, position);
CREATE INDEX idx_location_info_location ON location_info(location_id);
CREATE INDEX idx_location_info_order ON location_info(location_id, position);

CREATE TRIGGER update_locations_updated_at
  BEFORE UPDATE ON locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_location_info_updated_at
  BEFORE UPDATE ON location_info
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_info ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published locations are viewable by everyone"
  ON locations FOR SELECT
  USING (is_published = true OR auth.role() = 'authenticated');
CREATE POLICY "Locations are insertable by authenticated users"
  ON locations FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Locations are updatable by authenticated users"
  ON locations FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Locations are deletable by authenticated users"
  ON locations FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Location info are viewable by everyone"
  ON location_info FOR SELECT USING (true);
CREATE POLICY "Location info are insertable by authenticated users"
  ON location_info FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Location info are updatable by authenticated users"
  ON location_info FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Location info are deletable by authenticated users"
  ON location_info FOR DELETE USING (auth.role() = 'authenticated');

INSERT INTO storage.buckets (id, name, public)
VALUES ('location-media', 'location-media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read access for location-media"
  ON storage.objects FOR SELECT USING (bucket_id = 'location-media');
CREATE POLICY "Authenticated users can upload to location-media"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'location-media' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update location-media"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'location-media' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete from location-media"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'location-media' AND auth.role() = 'authenticated');
