-- Curated playlists (admin-managed) for /watch/playlists/[slug]
-- Run in Supabase SQL Editor after titles + content_type exist.

DO $$ BEGIN
  CREATE TYPE playlist_type AS ENUM ('movies', 'music_videos');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS playlists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  playlist_type playlist_type NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS playlist_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  title_id UUID NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(playlist_id, title_id)
);

CREATE INDEX IF NOT EXISTS idx_playlists_slug_active ON playlists(slug) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_playlist_items_playlist_order ON playlist_items(playlist_id, sort_order);

ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read active playlists" ON playlists;
CREATE POLICY "Public can read active playlists" ON playlists
  FOR SELECT TO public USING (is_active = true);

DROP POLICY IF EXISTS "Public can read playlist items" ON playlist_items;
CREATE POLICY "Public can read playlist items" ON playlist_items
  FOR SELECT TO public USING (
    EXISTS (SELECT 1 FROM playlists p WHERE p.id = playlist_id AND p.is_active = true)
  );

-- Admin UI uses authenticated client; align with music_channel policies
DROP POLICY IF EXISTS "Authenticated can manage playlists" ON playlists;
CREATE POLICY "Authenticated can manage playlists" ON playlists
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can manage playlist items" ON playlist_items;
CREATE POLICY "Authenticated can manage playlist items" ON playlist_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
