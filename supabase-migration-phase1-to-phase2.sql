-- Migration Script: Phase 1 to Phase 2
-- Run this if you have existing Phase 1 data
-- This updates your existing tables instead of recreating them

-- Step 1: Create content type enum
DO $$ BEGIN
  CREATE TYPE content_type AS ENUM ('film', 'series', 'music_video', 'podcast');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Step 2: Add new columns to existing titles table
ALTER TABLE titles 
  ADD COLUMN IF NOT EXISTS content_type content_type DEFAULT 'film',
  ADD COLUMN IF NOT EXISTS description TEXT;

-- Update category to allow music_videos
ALTER TABLE titles 
  DROP CONSTRAINT IF EXISTS titles_category_check;

ALTER TABLE titles
  ADD CONSTRAINT titles_category_check 
  CHECK (category IN ('trending', 'originals', 'new_releases', 'music_videos'));

-- Make mux_playback_id nullable (for series)
ALTER TABLE titles 
  ALTER COLUMN mux_playback_id DROP NOT NULL;

-- Step 3: Update all existing titles to be 'film' type if not already set
UPDATE titles 
SET content_type = 'film' 
WHERE content_type IS NULL;

-- Step 4: Create seasons table
CREATE TABLE IF NOT EXISTS seasons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  series_id UUID REFERENCES titles(id) ON DELETE CASCADE,
  season_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(series_id, season_number)
);

-- Step 5: Create episodes table
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

-- Step 6: Backup old playback_progress (IMPORTANT!)
-- Create a backup table before modifying
CREATE TABLE IF NOT EXISTS playback_progress_phase1_backup AS 
SELECT * FROM playback_progress;

-- Step 7: Drop old playback_progress and recreate with new structure
DROP TABLE IF EXISTS playback_progress CASCADE;

CREATE TABLE playback_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title_id UUID REFERENCES titles(id) ON DELETE CASCADE,
  episode_id UUID REFERENCES episodes(id) ON DELETE CASCADE,
  position_seconds REAL NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CHECK (
    (title_id IS NOT NULL AND episode_id IS NULL) OR
    (title_id IS NULL AND episode_id IS NOT NULL)
  ),
  UNIQUE(user_id, title_id, episode_id)
);

-- Step 8: Create indexes
CREATE INDEX IF NOT EXISTS idx_titles_content_type ON titles(content_type);
CREATE INDEX IF NOT EXISTS idx_titles_category ON titles(category);
CREATE INDEX IF NOT EXISTS idx_seasons_series ON seasons(series_id);
CREATE INDEX IF NOT EXISTS idx_episodes_season ON episodes(season_id);
CREATE INDEX IF NOT EXISTS idx_playback_progress_user ON playback_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_playback_progress_updated_at ON playback_progress(updated_at DESC);

-- Step 9: Update RLS policies

-- Titles policies (keep public access)
DROP POLICY IF EXISTS "Public read access for titles" ON titles;
DROP POLICY IF EXISTS "Public insert access for titles" ON titles;
DROP POLICY IF EXISTS "Public update access for titles" ON titles;
DROP POLICY IF EXISTS "Public delete access for titles" ON titles;

ALTER TABLE titles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for titles" ON titles
  FOR SELECT USING (true);

CREATE POLICY "Public insert access for titles" ON titles
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public update access for titles" ON titles
  FOR UPDATE USING (true);

CREATE POLICY "Public delete access for titles" ON titles
  FOR DELETE USING (true);

-- Seasons policies
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for seasons" ON seasons
  FOR SELECT USING (true);

CREATE POLICY "Public insert access for seasons" ON seasons
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public update access for seasons" ON seasons
  FOR UPDATE USING (true);

CREATE POLICY "Public delete access for seasons" ON seasons
  FOR DELETE USING (true);

-- Episodes policies
ALTER TABLE episodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for episodes" ON episodes
  FOR SELECT USING (true);

CREATE POLICY "Public insert access for episodes" ON episodes
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public update access for episodes" ON episodes
  FOR UPDATE USING (true);

CREATE POLICY "Public delete access for episodes" ON episodes
  FOR DELETE USING (true);

-- Playback progress policies (authenticated users only)
ALTER TABLE playback_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own progress" ON playback_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress" ON playback_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress" ON playback_progress
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own progress" ON playback_progress
  FOR DELETE USING (auth.uid() = user_id);

-- Step 10: Verify migration
-- Run these to check:
-- SELECT COUNT(*), content_type FROM titles GROUP BY content_type;
-- SELECT * FROM seasons;
-- SELECT * FROM episodes;
-- SELECT COUNT(*) FROM playback_progress;
-- SELECT COUNT(*) FROM playback_progress_phase1_backup;

-- Note: Phase 1 playback progress is backed up but NOT migrated
-- Users will need to create accounts and start fresh with Phase 2

