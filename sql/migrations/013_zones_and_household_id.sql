-- 013_zones_and_household_id.sql
-- Add zones table, household_registration_id, and zone assignment

-- ZONES TABLE
CREATE TABLE IF NOT EXISTS zones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  prefix TEXT NOT NULL UNIQUE,
  next_number INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view zones" ON zones FOR SELECT USING (true);
CREATE POLICY "Service role manages zones" ON zones FOR ALL USING (true) WITH CHECK (true);

-- Seed the 4 zones
INSERT INTO zones (name, prefix, next_number) VALUES
  ('Phungreitang – East', 'P-E', 1),
  ('Phungreitang – West', 'P-W', 1),
  ('Wino – East', 'W-E', 1),
  ('Wino – West', 'W-W', 1)
ON CONFLICT (name) DO NOTHING;

-- Add zone_id and household_registration_id to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS zone_id UUID REFERENCES zones(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS household_registration_id TEXT UNIQUE;

-- Index for zone-based queries
CREATE INDEX IF NOT EXISTS idx_users_zone_id ON users(zone_id);
CREATE INDEX IF NOT EXISTS idx_users_household_registration_id ON users(household_registration_id);

-- Function to generate next household registration ID for a zone
CREATE OR REPLACE FUNCTION generate_household_registration_id(zone_uuid UUID)
RETURNS TEXT AS $$
DECLARE
  zone_record RECORD;
  new_id TEXT;
BEGIN
  SELECT prefix, next_number INTO zone_record FROM zones WHERE id = zone_uuid FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Zone not found';
  END IF;
  new_id := zone_record.prefix || LPAD(zone_record.next_number::TEXT, 3, '0');
  UPDATE zones SET next_number = next_number + 1 WHERE id = zone_uuid;
  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
