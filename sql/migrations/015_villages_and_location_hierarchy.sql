-- 015_villages_and_location_hierarchy.sql
-- Add villages table for District > Village > Area > Household hierarchy

-- VILLAGES TABLE
CREATE TABLE IF NOT EXISTS villages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  district TEXT NOT NULL DEFAULT 'Ukhrul',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE villages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view villages" ON villages FOR SELECT USING (true);
CREATE POLICY "Service role manages villages" ON villages FOR ALL USING (true) WITH CHECK (true);

CREATE UNIQUE INDEX IF NOT EXISTS idx_villages_name_district ON villages(name, district);

-- Add village_id to areas (link area to village)
ALTER TABLE areas ADD COLUMN IF NOT EXISTS village_id UUID REFERENCES villages(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_areas_village_id ON areas(village_id);

-- Add village_id to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS village_id UUID REFERENCES villages(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_users_village_id ON users(village_id);

-- Add latitude/longitude to users for coordinate-based location
ALTER TABLE users ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 7);
ALTER TABLE users ADD COLUMN IF NOT EXISTS longitude DECIMAL(10, 7);

-- Seed Ukhrul district villages
INSERT INTO villages (name, district) VALUES
  ('Ukhrul Town', 'Ukhrul'),
  ('Phungreitang', 'Ukhrul'),
  ('Wino', 'Ukhrul'),
  ('Shangshak', 'Ukhrul'),
  ('Kharasang', 'Ukhrul'),
  ('Chassu', 'Ukhrul'),
  ('Hungpung', 'Ukhrul'),
  ('Sirarakhong', 'Ukhrul'),
  ('Tuishen', 'Ukhrul'),
  ('Khangkhui', 'Ukhrul')
ON CONFLICT (name, district) DO NOTHING;

-- Link existing areas to villages where names match
UPDATE areas SET village_id = (
  SELECT id FROM villages WHERE villages.name = areas.name AND villages.district = 'Ukhrul' LIMIT 1
) WHERE village_id IS NULL AND EXISTS (
  SELECT 1 FROM villages WHERE villages.name = areas.name AND villages.district = 'Ukhrul'
);
