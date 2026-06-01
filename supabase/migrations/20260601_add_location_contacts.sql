-- Campi contatto per la pagina /contatti (popolata dinamicamente dai luoghi).
ALTER TABLE locations ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE locations ADD COLUMN IF NOT EXISTS city VARCHAR(120);
ALTER TABLE locations ADD COLUMN IF NOT EXISTS emails JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN locations.phone IS 'Telefono mostrato in /contatti';
COMMENT ON COLUMN locations.city IS 'Titolo del blocco contatti (es. Cassano All Ionio)';
COMMENT ON COLUMN locations.emails IS 'Array di {label, email} per /contatti (es. Frati, Suore)';
