-- Warren Media Streaming Phase 3 Database Schema
-- Monetization + Controlled Creator Uploads
-- Run this AFTER Phase 2 schema

-- Feature flags table
CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  feature_name TEXT UNIQUE NOT NULL,
  enabled BOOLEAN DEFAULT false,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default Phase 3 flags (all disabled)
INSERT INTO feature_flags (feature_name, enabled, description) VALUES
  ('creator_uploads', false, 'Enable creator upload functionality'),
  ('ads_system', false, 'Enable pre-roll ads system'),
  ('event_tracking', false, 'Enable event tracking')
ON CONFLICT (feature_name) DO NOTHING;

-- Creator status enum
DO $$ BEGIN
  CREATE TYPE creator_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Creators table
CREATE TABLE IF NOT EXISTS creators (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  bio TEXT,
  status creator_status DEFAULT 'pending',
  application_notes TEXT,
  admin_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add creator_id to titles table
ALTER TABLE titles 
  ADD COLUMN IF NOT EXISTS creator_id UUID REFERENCES creators(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_creator_content BOOLEAN DEFAULT false;

-- Ad configuration for titles
CREATE TABLE IF NOT EXISTS title_ad_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title_id UUID REFERENCES titles(id) ON DELETE CASCADE UNIQUE,
  ads_enabled BOOLEAN DEFAULT false,
  ad_duration_seconds INTEGER DEFAULT 15 CHECK (ad_duration_seconds BETWEEN 5 AND 30),
  ad_url TEXT, -- URL to ad video/content
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Event tracking - Play events
CREATE TABLE IF NOT EXISTS play_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title_id UUID REFERENCES titles(id) ON DELETE CASCADE,
  episode_id UUID REFERENCES episodes(id) ON DELETE CASCADE,
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CHECK (
    (title_id IS NOT NULL AND episode_id IS NULL) OR
    (title_id IS NULL AND episode_id IS NOT NULL)
  )
);

-- Event tracking - Completion events
CREATE TABLE IF NOT EXISTS completion_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title_id UUID REFERENCES titles(id) ON DELETE CASCADE,
  episode_id UUID REFERENCES episodes(id) ON DELETE CASCADE,
  session_id TEXT,
  watch_percentage REAL CHECK (watch_percentage >= 0 AND watch_percentage <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CHECK (
    (title_id IS NOT NULL AND episode_id IS NULL) OR
    (title_id IS NULL AND episode_id IS NOT NULL)
  )
);

-- Event tracking - Ad impression events
CREATE TABLE IF NOT EXISTS ad_impression_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title_id UUID REFERENCES titles(id) ON DELETE CASCADE,
  episode_id UUID REFERENCES episodes(id) ON DELETE CASCADE,
  session_id TEXT,
  ad_duration_seconds INTEGER,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CHECK (
    (title_id IS NOT NULL AND episode_id IS NULL) OR
    (title_id IS NULL AND episode_id IS NOT NULL)
  )
);

-- Mux upload tracking
CREATE TABLE IF NOT EXISTS mux_uploads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,
  mux_upload_id TEXT NOT NULL,
  mux_asset_id TEXT,
  mux_playback_id TEXT,
  status TEXT DEFAULT 'preparing', -- preparing, asset_created, ready, errored
  title_metadata JSONB, -- Store title metadata until upload is complete
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_creators_status ON creators(status);
CREATE INDEX IF NOT EXISTS idx_creators_user_id ON creators(user_id);
CREATE INDEX IF NOT EXISTS idx_titles_creator ON titles(creator_id);
CREATE INDEX IF NOT EXISTS idx_play_events_created ON play_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_completion_events_created ON completion_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ad_impression_events_created ON ad_impression_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mux_uploads_creator ON mux_uploads(creator_id);
CREATE INDEX IF NOT EXISTS idx_mux_uploads_status ON mux_uploads(status);

-- Enable Row Level Security
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE title_ad_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE play_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE completion_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_impression_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE mux_uploads ENABLE ROW LEVEL SECURITY;

-- Feature flags policies (admin read only via service role)
CREATE POLICY "Public read feature flags" ON feature_flags
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage feature flags" ON feature_flags
  FOR ALL USING (true);

-- Creators policies
CREATE POLICY "Public read approved creators" ON creators
  FOR SELECT USING (status = 'approved');

CREATE POLICY "Users can view own creator profile" ON creators
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create creator application" ON creators
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pending application" ON creators
  FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');

-- Admin can manage all creators (via service role or admin check)
CREATE POLICY "Service role can manage creators" ON creators
  FOR ALL USING (true);

-- Title ad config policies (admin only via service role)
CREATE POLICY "Service role can manage ad config" ON title_ad_config
  FOR ALL USING (true);

-- Event tracking policies (write-only for users, read via service role)
CREATE POLICY "Users can log play events" ON play_events
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can log completion events" ON completion_events
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can log ad impression events" ON ad_impression_events
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role can read events" ON play_events
  FOR SELECT USING (true);

CREATE POLICY "Service role can read completion events" ON completion_events
  FOR SELECT USING (true);

CREATE POLICY "Service role can read ad events" ON ad_impression_events
  FOR SELECT USING (true);

-- Mux uploads policies
CREATE POLICY "Creators can view own uploads" ON mux_uploads
  FOR SELECT USING (
    creator_id IN (
      SELECT id FROM creators WHERE user_id = auth.uid() AND status = 'approved'
    )
  );

CREATE POLICY "Approved creators can create uploads" ON mux_uploads
  FOR INSERT WITH CHECK (
    creator_id IN (
      SELECT id FROM creators WHERE user_id = auth.uid() AND status = 'approved'
    )
  );

CREATE POLICY "Creators can update own uploads" ON mux_uploads
  FOR UPDATE USING (
    creator_id IN (
      SELECT id FROM creators WHERE user_id = auth.uid() AND status = 'approved'
    )
  );

CREATE POLICY "Service role can manage uploads" ON mux_uploads
  FOR ALL USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_creators_updated_at ON creators;
CREATE TRIGGER update_creators_updated_at
  BEFORE UPDATE ON creators
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_title_ad_config_updated_at ON title_ad_config;
CREATE TRIGGER update_title_ad_config_updated_at
  BEFORE UPDATE ON title_ad_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_mux_uploads_updated_at ON mux_uploads;
CREATE TRIGGER update_mux_uploads_updated_at
  BEFORE UPDATE ON mux_uploads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

