-- Events (Attività): volantini-immagine ed eventi testuali, legati a un luogo via slug.
-- lang NULL = vale per tutte le lingue (es. un volantino immagine); lang valorizzato = solo quella lingua (evento testuale tradotto).
CREATE TABLE IF NOT EXISTS events (
  id BIGSERIAL PRIMARY KEY,
  location_slug VARCHAR(120) NOT NULL,
  lang VARCHAR(5),
  type VARCHAR(10) NOT NULL DEFAULT 'text',
  title VARCHAR(255),
  body TEXT,
  image TEXT,
  event_date DATE,
  position INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON COLUMN events.lang IS 'NULL = tutte le lingue (es. volantino immagine); valorizzato = solo quella lingua';
COMMENT ON COLUMN events.type IS 'text | flyer';

CREATE INDEX IF NOT EXISTS idx_events_slug ON events(location_slug);
CREATE INDEX IF NOT EXISTS idx_events_lang ON events(lang);
CREATE INDEX IF NOT EXISTS idx_events_published ON events(is_published);
CREATE INDEX IF NOT EXISTS idx_events_order ON events(location_slug, position);

DROP TRIGGER IF EXISTS update_events_updated_at ON events;
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Published events are viewable by everyone" ON events;
CREATE POLICY "Published events are viewable by everyone"
  ON events FOR SELECT USING (is_published = true OR auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Events are insertable by authenticated users" ON events;
CREATE POLICY "Events are insertable by authenticated users"
  ON events FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Events are updatable by authenticated users" ON events;
CREATE POLICY "Events are updatable by authenticated users"
  ON events FOR UPDATE USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Events are deletable by authenticated users" ON events;
CREATE POLICY "Events are deletable by authenticated users"
  ON events FOR DELETE USING (auth.role() = 'authenticated');
