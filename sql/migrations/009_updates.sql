-- Updates table for announcements, progress, features, community notices
CREATE TABLE IF NOT EXISTS updates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  image_data TEXT,
  link_url TEXT,
  link_label TEXT,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policies
ALTER TABLE updates ENABLE ROW LEVEL SECURITY;

-- Anyone can read published updates
CREATE POLICY "Public can read published updates" ON updates
  FOR SELECT USING (is_published = true);

-- Service role can do everything
CREATE POLICY "Service role manages updates" ON updates
  FOR ALL USING (auth.role() = 'service_role');

-- Index
CREATE INDEX idx_updates_published ON updates(is_published, created_at DESC);
