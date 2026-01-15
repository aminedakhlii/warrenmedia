-- Warren Media Streaming Database Schema
-- Run this in your Supabase SQL Editor

-- Titles table
CREATE TABLE IF NOT EXISTS titles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  poster_url TEXT NOT NULL,
  mux_playback_id TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('trending', 'originals', 'new_releases')),
  runtime_seconds INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Playback progress table
CREATE TABLE IF NOT EXISTS playback_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title_id UUID REFERENCES titles(id) ON DELETE CASCADE,
  position_seconds REAL NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(title_id)
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_titles_category ON titles(category);
CREATE INDEX IF NOT EXISTS idx_playback_progress_updated_at ON playback_progress(updated_at DESC);

-- Enable Row Level Security (RLS) but allow public access for Phase 1
ALTER TABLE titles ENABLE ROW LEVEL SECURITY;
ALTER TABLE playback_progress ENABLE ROW LEVEL SECURITY;

-- Policies for public read access
CREATE POLICY "Public read access for titles" ON titles
  FOR SELECT USING (true);

CREATE POLICY "Public read access for playback_progress" ON playback_progress
  FOR SELECT USING (true);

CREATE POLICY "Public insert access for playback_progress" ON playback_progress
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public update access for playback_progress" ON playback_progress
  FOR UPDATE USING (true);

CREATE POLICY "Public insert access for titles" ON titles
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public update access for titles" ON titles
  FOR UPDATE USING (true);

CREATE POLICY "Public delete access for titles" ON titles
  FOR DELETE USING (true);

