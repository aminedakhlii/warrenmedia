-- Music Channel: playlist and settings
-- Run in Supabase SQL Editor after Phase 2/3 schema

-- Settings: single row (is_live, loop_enabled, optional pre-roll ad)
CREATE TABLE IF NOT EXISTS music_channel_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  is_live BOOLEAN NOT NULL DEFAULT true,
  loop_enabled BOOLEAN NOT NULL DEFAULT true,
  ad_playback_id TEXT,
  ad_duration_seconds INTEGER DEFAULT 15,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default row (run once; ignore if already exists)
INSERT INTO music_channel_settings (id, is_live, loop_enabled)
VALUES ('00000000-0000-0000-0000-000000000001'::uuid, true, true)
ON CONFLICT (id) DO NOTHING;

-- Playlist: ordered list of music videos (references titles)
CREATE TABLE IF NOT EXISTS music_channel_playlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title_id UUID NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(title_id)
);

CREATE INDEX IF NOT EXISTS idx_music_playlist_position ON music_channel_playlist(position) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_music_playlist_active ON music_channel_playlist(is_active);

-- RLS: public read for playlist and settings; admin write via service role or add policies
ALTER TABLE music_channel_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE music_channel_playlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read music channel settings" ON music_channel_settings;
CREATE POLICY "Public can read music channel settings" ON music_channel_settings
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Public can read music playlist" ON music_channel_playlist;
CREATE POLICY "Public can read music playlist" ON music_channel_playlist
  FOR SELECT TO public USING (true);

-- Admin write: allow authenticated with admin check, or use service role in API
-- For simplicity, allow insert/update/delete for authenticated (admin UI will be protected by AdminGuard)
DROP POLICY IF EXISTS "Authenticated can manage music settings" ON music_channel_settings;
CREATE POLICY "Authenticated can manage music settings" ON music_channel_settings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can manage music playlist" ON music_channel_playlist;
CREATE POLICY "Authenticated can manage music playlist" ON music_channel_playlist
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
