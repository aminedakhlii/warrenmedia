-- Cision Content API integration
-- Run after the titles and admin_users schemas.

ALTER TABLE titles
  ADD COLUMN IF NOT EXISTS external_source TEXT,
  ADD COLUMN IF NOT EXISTS external_id TEXT,
  ADD COLUMN IF NOT EXISTS external_media_url TEXT,
  ADD COLUMN IF NOT EXISTS external_media_type TEXT,
  ADD COLUMN IF NOT EXISTS external_source_url TEXT,
  ADD COLUMN IF NOT EXISTS source_published_at TIMESTAMPTZ;

DO $$ BEGIN
  ALTER TABLE titles
    ADD CONSTRAINT titles_external_source_check
    CHECK (external_source IS NULL OR external_source = 'cision');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE titles
    ADD CONSTRAINT titles_external_media_url_check
    CHECK (external_media_url IS NULL OR external_media_url ~ '^https://');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_titles_external_source_id
  ON titles(external_source, external_id)
  WHERE external_source IS NOT NULL AND external_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_titles_source_published_at
  ON titles(source_published_at DESC)
  WHERE source_published_at IS NOT NULL;

-- Cision login is limited to three calls per five minutes. This server-only
-- cache lets all app instances reuse the same short-lived bearer token.
CREATE TABLE IF NOT EXISTS cision_auth_cache (
  cache_key TEXT PRIMARY KEY DEFAULT 'default' CHECK (cache_key = 'default'),
  auth_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE cision_auth_cache ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE cision_auth_cache FROM anon, authenticated;

COMMENT ON TABLE cision_auth_cache IS
  'Server-only Cision bearer token cache. Access only with Supabase service role.';
