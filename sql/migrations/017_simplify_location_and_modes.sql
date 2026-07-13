-- Migration 017: Simplify location, add mapping modes, request workflow

-- 1. Add location text field to users (replaces zone/village structured location)
ALTER TABLE users ADD COLUMN IF NOT EXISTS location TEXT;

-- 2. Add mode to mapping_projects: 'single' or 'multiple'
ALTER TABLE mapping_projects ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'single' CHECK (mode IN ('single', 'multiple'));

-- 3. Add request workflow statuses to update_requests
-- Existing: pending, approved, rejected
-- New: under_review, needs_clarification, completed
-- The check constraint may already exist, so we handle gracefully
DO $$ BEGIN
  ALTER TABLE update_requests DROP CONSTRAINT IF EXISTS update_requests_status_check;
  ALTER TABLE update_requests ADD CONSTRAINT update_requests_status_check
    CHECK (status IN ('pending', 'under_review', 'needs_clarification', 'approved', 'rejected', 'completed'));
EXCEPTION WHEN others THEN NULL;
END $$;

-- 4. Add resolved_at column if not exists
ALTER TABLE update_requests ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
