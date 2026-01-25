-- =============================================
-- Phase 5: Stability, Scale & App Readiness
-- Database Hardening & Performance Optimization
-- =============================================

-- =============================================
-- A) ADMIN ROLE SYSTEM
-- =============================================

-- Add admin role to users (using Supabase metadata pattern)
-- We'll store admin status in a separate table for better control

CREATE TABLE IF NOT EXISTS admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT
);

-- Index for fast admin checks
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON admin_users(user_id);

-- RLS: Only admins can view admin list
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view admin list" ON admin_users
  FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM admin_users)
  );

-- Only existing admins can grant admin (after first manual grant)
CREATE POLICY "Only admins can grant admin" ON admin_users
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT user_id FROM admin_users)
  );

-- =============================================
-- B) PERFORMANCE INDEXES (CRITICAL)
-- =============================================

-- Titles table indexes for filtering and sorting
CREATE INDEX IF NOT EXISTS idx_titles_category ON titles(category);
CREATE INDEX IF NOT EXISTS idx_titles_content_type ON titles(content_type);
CREATE INDEX IF NOT EXISTS idx_titles_created_at ON titles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_titles_category_created ON titles(category, created_at DESC);

-- Playback progress indexes for continue watching
CREATE INDEX IF NOT EXISTS idx_playback_progress_user ON playback_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_playback_progress_user_updated ON playback_progress(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_playback_progress_title ON playback_progress(title_id);
CREATE INDEX IF NOT EXISTS idx_playback_progress_episode ON playback_progress(episode_id);

-- Episodes indexes for series queries
CREATE INDEX IF NOT EXISTS idx_episodes_season ON episodes(season_id);
CREATE INDEX IF NOT EXISTS idx_episodes_season_number ON episodes(season_id, episode_number);

-- Seasons indexes
CREATE INDEX IF NOT EXISTS idx_seasons_series ON seasons(series_id);
CREATE INDEX IF NOT EXISTS idx_seasons_series_number ON seasons(series_id, season_number);

-- Creator content indexes
CREATE INDEX IF NOT EXISTS idx_titles_creator ON titles(creator_id);
CREATE INDEX IF NOT EXISTS idx_mux_uploads_creator ON mux_uploads(creator_id);

-- Event tables indexes for analytics (Phase 3 uses separate event tables)
CREATE INDEX IF NOT EXISTS idx_play_events_user ON play_events(user_id);
CREATE INDEX IF NOT EXISTS idx_play_events_title ON play_events(title_id);
CREATE INDEX IF NOT EXISTS idx_play_events_created ON play_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_completion_events_user ON completion_events(user_id);
CREATE INDEX IF NOT EXISTS idx_completion_events_title ON completion_events(title_id);
CREATE INDEX IF NOT EXISTS idx_completion_events_created ON completion_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ad_impression_events_user ON ad_impression_events(user_id);
CREATE INDEX IF NOT EXISTS idx_ad_impression_events_title ON ad_impression_events(title_id);
CREATE INDEX IF NOT EXISTS idx_ad_impression_events_created ON ad_impression_events(created_at DESC);

-- Rate limit events indexes
CREATE INDEX IF NOT EXISTS idx_rate_limit_user_action ON rate_limit_events(user_id, action_type);
CREATE INDEX IF NOT EXISTS idx_rate_limit_created ON rate_limit_events(created_at DESC);

-- Creators table indexes
CREATE INDEX IF NOT EXISTS idx_creators_user_id ON creators(user_id);
CREATE INDEX IF NOT EXISTS idx_creators_status ON creators(status);

-- Reported content indexes for moderation
CREATE INDEX IF NOT EXISTS idx_reported_content_status ON reported_content(status);
CREATE INDEX IF NOT EXISTS idx_reported_content_type ON reported_content(content_type);

-- =============================================
-- C) QUERY OPTIMIZATION VIEWS (OPTIONAL)
-- =============================================

-- Materialized view for trending content (can be refreshed periodically)
-- This is optional but helps with homepage performance

CREATE OR REPLACE VIEW trending_titles_view AS
SELECT 
  t.*,
  COUNT(DISTINCT el.user_id) as play_count_7days
FROM titles t
LEFT JOIN event_logs el ON el.title_id = t.id 
  AND el.event_type = 'play'
  AND el.created_at > NOW() - INTERVAL '7 days'
WHERE t.category = 'trending'
GROUP BY t.id
ORDER BY play_count_7days DESC, t.created_at DESC;

-- =============================================
-- D) DATA CLEANUP POLICIES
-- =============================================

-- Function to clean old rate limit events (older than 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM rate_limit_events 
  WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean old event logs (optional, keep for 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_event_logs()
RETURNS void AS $$
BEGIN
  -- Clean play events
  DELETE FROM play_events 
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  -- Clean completion events
  DELETE FROM completion_events 
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  -- Clean ad impression events
  DELETE FROM ad_impression_events 
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- E) FIRST ADMIN SETUP (MANUAL)
-- =============================================

-- INSTRUCTIONS: Replace 'your-user-id-here' with your actual user UUID
-- Get your user ID from: SELECT id FROM auth.users WHERE email = 'your-email@example.com';

-- INSERT INTO admin_users (user_id, notes)
-- VALUES ('your-user-id-here', 'Initial admin user')
-- ON CONFLICT (user_id) DO NOTHING;

-- =============================================
-- F) ADMIN CHECK FUNCTION
-- =============================================

-- Function to check if a user is an admin
CREATE OR REPLACE FUNCTION is_admin(check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = check_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- PHASE 5 SETUP COMPLETE
-- =============================================

-- Next steps:
-- 1. Insert your user as the first admin (see section E above)
-- 2. Update admin routes to check is_admin()
-- 3. Add rate limiting to auth and upload endpoints
-- 4. Implement error tracking
-- 5. Test all changes thoroughly

-- Performance note:
-- Run ANALYZE after creating indexes to update query planner stats
ANALYZE;

