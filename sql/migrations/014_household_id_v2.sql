-- 014_household_id_v2.sql
-- New Household ID format: <Zone Prefix>-<Optional Area Code>-<Sequential Number>
-- Examples: WE-001, WE-K-001, PW-001, PE-A-001

-- Add zone_id and code to areas (make areas zone-specific)
ALTER TABLE areas ADD COLUMN IF NOT EXISTS zone_id UUID REFERENCES zones(id) ON DELETE CASCADE;
ALTER TABLE areas ADD COLUMN IF NOT EXISTS code TEXT;

-- Add area_id to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS area_id UUID REFERENCES areas(id) ON DELETE SET NULL;

-- Index for area-based queries
CREATE INDEX IF NOT EXISTS idx_users_area_id ON users(area_id);
CREATE INDEX IF NOT EXISTS idx_areas_zone_id ON areas(zone_id);

-- Ensure unique area codes per zone
CREATE UNIQUE INDEX IF NOT EXISTS idx_areas_zone_code ON areas(zone_id, code) WHERE code IS NOT NULL;

-- Household ID sequences table: tracks next number per series
-- Series = zone prefix (e.g. "WE") or zone prefix + area code (e.g. "WE-K")
CREATE TABLE IF NOT EXISTS household_id_sequences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  series TEXT NOT NULL UNIQUE,
  next_number INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE household_id_sequences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages sequences" ON household_id_sequences FOR ALL USING (true) WITH CHECK (true);

-- Seed sequences for existing zones (without area)
INSERT INTO household_id_sequences (series, next_number)
SELECT prefix, 1 FROM zones
ON CONFLICT (series) DO NOTHING;

-- New function: generate household registration ID
-- Accepts zone_uuid and optional area_uuid
CREATE OR REPLACE FUNCTION generate_household_registration_id(zone_uuid UUID, area_uuid UUID DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
  zone_record RECORD;
  area_record RECORD;
  series_key TEXT;
  seq_record RECORD;
  new_number INT;
  new_id TEXT;
  num_digits INT;
BEGIN
  -- Get zone prefix
  SELECT prefix INTO zone_record FROM zones WHERE id = zone_uuid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Zone not found';
  END IF;

  -- Build series key
  IF area_uuid IS NOT NULL THEN
    SELECT code INTO area_record FROM areas WHERE id = area_uuid AND zone_id = zone_uuid;
    IF NOT FOUND OR area_record.code IS NULL THEN
      RAISE EXCEPTION 'Area not found or missing code';
    END IF;
    series_key := zone_record.prefix || '-' || area_record.code;
  ELSE
    series_key := zone_record.prefix;
  END IF;

  -- Get or create sequence row with lock
  INSERT INTO household_id_sequences (series, next_number)
  VALUES (series_key, 1)
  ON CONFLICT (series) DO NOTHING;

  SELECT id, next_number INTO seq_record
  FROM household_id_sequences
  WHERE series = series_key
  FOR UPDATE;

  new_number := seq_record.next_number;

  -- Determine digit count: 3 by default, 4 when > 999
  IF new_number > 999 THEN
    num_digits := 4;
  ELSE
    num_digits := 3;
  END IF;

  new_id := series_key || '-' || LPAD(new_number::TEXT, num_digits, '0');

  -- Increment sequence
  UPDATE household_id_sequences
  SET next_number = next_number + 1
  WHERE id = seq_record.id;

  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Seed some areas for existing zones
-- Zone IDs will be looked up by name
DO $$
DECLARE
  pe_id UUID;
  pw_id UUID;
  we_id UUID;
  ww_id UUID;
BEGIN
  SELECT id INTO pe_id FROM zones WHERE name = 'Phungreitang – East';
  SELECT id INTO pw_id FROM zones WHERE name = 'Phungreitang – West';
  SELECT id INTO we_id FROM zones WHERE name = 'Wino – East';
  SELECT id INTO ww_id FROM zones WHERE name = 'Wino – West';

  -- Areas for Phungreitang East
  IF pe_id IS NOT NULL THEN
    INSERT INTO areas (name, zone_id, code) VALUES
      ('Hangso', pe_id, 'H'),
      ('Viewland', pe_id, 'V')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Areas for Phungreitang West
  IF pw_id IS NOT NULL THEN
    INSERT INTO areas (name, zone_id, code) VALUES
      ('Dungri', pw_id, 'D'),
      ('Merathing', pw_id, 'M')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Areas for Wino East
  IF we_id IS NOT NULL THEN
    INSERT INTO areas (name, zone_id, code) VALUES
      ('Kazar', we_id, 'K'),
      ('Kharasang', we_id, 'KS')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Areas for Wino West
  IF ww_id IS NOT NULL THEN
    INSERT INTO areas (name, zone_id, code) VALUES
      ('Shangshak', ww_id, 'S'),
      ('Chassu', ww_id, 'C')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
