-- 016_mapping_projects.sql
-- Add mapping projects table for admin-controlled mapping scope

-- MAPPING PROJECTS TABLE
CREATE TABLE IF NOT EXISTS mapping_projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  zone_feature_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE mapping_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view mapping projects" ON mapping_projects FOR SELECT USING (true);
CREATE POLICY "Service role manages mapping projects" ON mapping_projects FOR ALL USING (true) WITH CHECK (true);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mapping_projects_name ON mapping_projects(name);

-- Add mapping_project_id to villages
ALTER TABLE villages ADD COLUMN IF NOT EXISTS mapping_project_id UUID REFERENCES mapping_projects(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_villages_mapping_project_id ON villages(mapping_project_id);

-- Add mapping_project_id to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS mapping_project_id UUID REFERENCES mapping_projects(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_users_mapping_project_id ON users(mapping_project_id);

-- Seed default mapping project
INSERT INTO mapping_projects (name, is_active, zone_feature_enabled) VALUES ('Ukhrul', true, true);

-- Link existing villages to Ukhrul mapping project
UPDATE villages SET mapping_project_id = (
  SELECT id FROM mapping_projects WHERE name = 'Ukhrul' LIMIT 1
) WHERE mapping_project_id IS NULL;
