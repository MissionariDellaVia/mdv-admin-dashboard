-- Riscrittura policy di SCRITTURA per il modello a ruoli. Idempotente.
-- Le SELECT pubbliche NON vengono toccate (app pubblica + mobile invariate).

-- ── events: scrivibili da chi può editare quel luogo ──
DROP POLICY IF EXISTS "Events are insertable by authenticated users" ON events;
DROP POLICY IF EXISTS "Events are updatable by authenticated users" ON events;
DROP POLICY IF EXISTS "Events are deletable by authenticated users" ON events;
CREATE POLICY "events editable by location editors" ON events FOR INSERT
  WITH CHECK (can_edit_location(location_slug));
CREATE POLICY "events updatable by location editors" ON events FOR UPDATE
  USING (can_edit_location(location_slug)) WITH CHECK (can_edit_location(location_slug));
CREATE POLICY "events deletable by location editors" ON events FOR DELETE
  USING (can_edit_location(location_slug));

-- ── location_info: tramite il luogo collegato (location_id -> locations.slug) ──
DROP POLICY IF EXISTS "Location info are insertable by authenticated users" ON location_info;
DROP POLICY IF EXISTS "Location info are updatable by authenticated users" ON location_info;
DROP POLICY IF EXISTS "Location info are deletable by authenticated users" ON location_info;
CREATE POLICY "location_info editable by location editors" ON location_info FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM locations l
                      WHERE l.id = location_info.location_id AND can_edit_location(l.slug)));
CREATE POLICY "location_info updatable by location editors" ON location_info FOR UPDATE
  USING (EXISTS (SELECT 1 FROM locations l
                 WHERE l.id = location_info.location_id AND can_edit_location(l.slug)))
  WITH CHECK (EXISTS (SELECT 1 FROM locations l
                      WHERE l.id = location_info.location_id AND can_edit_location(l.slug)));
CREATE POLICY "location_info deletable by location editors" ON location_info FOR DELETE
  USING (EXISTS (SELECT 1 FROM locations l
                 WHERE l.id = location_info.location_id AND can_edit_location(l.slug)));

-- ── locations (anagrafica): solo admin ──
DROP POLICY IF EXISTS "Locations are insertable by authenticated users" ON locations;
DROP POLICY IF EXISTS "Locations are updatable by authenticated users" ON locations;
DROP POLICY IF EXISTS "Locations are deletable by authenticated users" ON locations;
CREATE POLICY "locations admin insert" ON locations FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "locations admin update" ON locations FOR UPDATE USING (is_admin());
CREATE POLICY "locations admin delete" ON locations FOR DELETE USING (is_admin());

-- ── contenuti non-luogo: solo admin ──
DROP POLICY IF EXISTS "Gospels are insertable by authenticated users" ON gospels;
DROP POLICY IF EXISTS "Gospels are updatable by authenticated users" ON gospels;
DROP POLICY IF EXISTS "Gospels are deletable by authenticated users" ON gospels;
CREATE POLICY "gospels admin insert" ON gospels FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "gospels admin update" ON gospels FOR UPDATE USING (is_admin());
CREATE POLICY "gospels admin delete" ON gospels FOR DELETE USING (is_admin());

DROP POLICY IF EXISTS "Gospel_daily are insertable by authenticated users" ON gospel_daily;
DROP POLICY IF EXISTS "Gospel_daily are updatable by authenticated users" ON gospel_daily;
DROP POLICY IF EXISTS "Gospel_daily are deletable by authenticated users" ON gospel_daily;
CREATE POLICY "gospel_daily admin insert" ON gospel_daily FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "gospel_daily admin update" ON gospel_daily FOR UPDATE USING (is_admin());
CREATE POLICY "gospel_daily admin delete" ON gospel_daily FOR DELETE USING (is_admin());

DROP POLICY IF EXISTS "Comment sections are insertable by authenticated users" ON comment_sections;
DROP POLICY IF EXISTS "Comment sections are updatable by authenticated users" ON comment_sections;
DROP POLICY IF EXISTS "Comment sections are deletable by authenticated users" ON comment_sections;
CREATE POLICY "comment_sections admin insert" ON comment_sections FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "comment_sections admin update" ON comment_sections FOR UPDATE USING (is_admin());
CREATE POLICY "comment_sections admin delete" ON comment_sections FOR DELETE USING (is_admin());

DROP POLICY IF EXISTS "Media are insertable by authenticated users" ON media;
DROP POLICY IF EXISTS "Media are updatable by authenticated users" ON media;
DROP POLICY IF EXISTS "Media are deletable by authenticated users" ON media;
CREATE POLICY "media admin insert" ON media FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "media admin update" ON media FOR UPDATE USING (is_admin());
CREATE POLICY "media admin delete" ON media FOR DELETE USING (is_admin());

DROP POLICY IF EXISTS "Seeds are insertable by authenticated users" ON seeds;
DROP POLICY IF EXISTS "Seeds are updatable by authenticated users" ON seeds;
DROP POLICY IF EXISTS "Seeds are deletable by authenticated users" ON seeds;
CREATE POLICY "seeds admin insert" ON seeds FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "seeds admin update" ON seeds FOR UPDATE USING (is_admin());
CREATE POLICY "seeds admin delete" ON seeds FOR DELETE USING (is_admin());
