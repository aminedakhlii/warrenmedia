-- Warren Media Streaming Phase 2 Database Schema
-- Run this in your Supabase SQL Editor AFTER running the Phase 1 schema
-- Or run this as a fresh schema if starting Phase 2 from scratch

-- Drop existing tables if migrating (CAREFUL!)
-- DROP TABLE IF EXISTS playback_progress CASCADE;
-- DROP TABLE IF EXISTS episodes CASCADE;
-- DROP TABLE IF EXISTS seasons CASCADE;
-- DROP TABLE IF EXISTS titles CASCADE;

-- Content types enum
DO $$ BEGIN
  CREATE TYPE content_type AS ENUM ('film', 'series', 'music_video', 'podcast');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Titles table (updated for Phase 2)
CREATE TABLE IF NOT EXISTS titles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  poster_url TEXT NOT NULL,
  mux_playback_id TEXT, -- Null for series (episodes have playback IDs)
  content_type content_type NOT NULL DEFAULT 'film',
  category TEXT NOT NULL CHECK (category IN ('trending', 'originals', 'new_releases', 'music_videos')),
  runtime_seconds INTEGER DEFAULT 0, -- For films, music videos, podcasts
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seasons table (for series only)
CREATE TABLE IF NOT EXISTS seasons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  series_id UUID REFERENCES titles(id) ON DELETE CASCADE,
  season_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(series_id, season_number)
);

-- Episodes table (for series only)
CREATE TABLE IF NOT EXISTS episodes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  season_id UUID REFERENCES seasons(id) ON DELETE CASCADE,
  episode_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  mux_playback_id TEXT NOT NULL,
  runtime_seconds INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(season_id, episode_number)
);

-- Playback progress table (updated for Phase 2 - user-specific)
CREATE TABLE IF NOT EXISTS playback_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title_id UUID REFERENCES titles(id) ON DELETE CASCADE,
  episode_id UUID REFERENCES episodes(id) ON DELETE CASCADE, -- For series episodes
  position_seconds REAL NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Either title_id OR episode_id must be set, but not both
  CHECK (
    (title_id IS NOT NULL AND episode_id IS NULL) OR
    (title_id IS NULL AND episode_id IS NOT NULL)
  ),
  -- One progress record per user per title/episode
  UNIQUE(user_id, title_id, episode_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_titles_content_type ON titles(content_type);
CREATE INDEX IF NOT EXISTS idx_titles_category ON titles(category);
CREATE INDEX IF NOT EXISTS idx_seasons_series ON seasons(series_id);
CREATE INDEX IF NOT EXISTS idx_episodes_season ON episodes(season_id);
CREATE INDEX IF NOT EXISTS idx_playback_progress_user ON playback_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_playback_progress_updated_at ON playback_progress(updated_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE titles ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE playback_progress ENABLE ROW LEVEL SECURITY;

-- Policies for titles (public read)
DROP POLICY IF EXISTS "Public read access for titles" ON titles;
CREATE POLICY "Public read access for titles" ON titles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert access for titles" ON titles;
CREATE POLICY "Public insert access for titles" ON titles
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public update access for titles" ON titles;
CREATE POLICY "Public update access for titles" ON titles
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public delete access for titles" ON titles;
CREATE POLICY "Public delete access for titles" ON titles
  FOR DELETE USING (true);

-- Policies for seasons (public read)
CREATE POLICY "Public read access for seasons" ON seasons
  FOR SELECT USING (true);

CREATE POLICY "Public insert access for seasons" ON seasons
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public update access for seasons" ON seasons
  FOR UPDATE USING (true);

CREATE POLICY "Public delete access for seasons" ON seasons
  FOR DELETE USING (true);

-- Policies for episodes (public read)
CREATE POLICY "Public read access for episodes" ON episodes
  FOR SELECT USING (true);

CREATE POLICY "Public insert access for episodes" ON episodes
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public update access for episodes" ON episodes
  FOR UPDATE USING (true);

CREATE POLICY "Public delete access for episodes" ON episodes
  FOR DELETE USING (true);

-- Policies for playback_progress (authenticated users only)
DROP POLICY IF EXISTS "Public read access for playback_progress" ON playback_progress;
DROP POLICY IF EXISTS "Public insert access for playback_progress" ON playback_progress;
DROP POLICY IF EXISTS "Public update access for playback_progress" ON playback_progress;

CREATE POLICY "Users can view own progress" ON playback_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress" ON playback_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress" ON playback_progress
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own progress" ON playback_progress
  FOR DELETE USING (auth.uid() = user_id);

