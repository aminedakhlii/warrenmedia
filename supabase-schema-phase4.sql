-- =============================================
-- Phase 4: Community (Cinema-First, Non-Noisy)
-- =============================================
-- This schema adds light community features without disrupting the viewing experience.
-- All features are contained, optional, and secondary to the cinema experience.

-- =============================================
-- A) COMMENTS SYSTEM
-- =============================================

-- Comments table: attach to titles and optionally episodes
CREATE TABLE IF NOT EXISTS comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title_id UUID NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
  episode_id UUID REFERENCES episodes(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE, -- For 1-level replies only
  content TEXT NOT NULL CHECK (length(content) > 0 AND length(content) <= 1000),
  
  -- Moderation fields
  is_hidden BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  hidden_by UUID REFERENCES auth.users(id),
  hidden_at TIMESTAMP WITH TIME ZONE,
  hidden_reason TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for efficient querying
CREATE INDEX IF NOT EXISTS idx_comments_title ON comments(title_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_episode ON comments(episode_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_comment_id);

-- =============================================
-- B) REACTIONS (MINIMAL)
-- =============================================

-- Comment reactions: 1-3 types max (Like, Love, Laugh)
CREATE TABLE IF NOT EXISTS comment_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type VARCHAR(20) NOT NULL CHECK (reaction_type IN ('like', 'love', 'laugh')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- One reaction per user per comment
  UNIQUE(comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_reactions_comment ON comment_reactions(comment_id);
CREATE INDEX IF NOT EXISTS idx_reactions_user ON comment_reactions(user_id);

-- =============================================
-- C) CREATOR POSTS (OPTIONAL, FEATURE-FLAGGED)
-- =============================================

-- Creator posts: static announcements tied to titles or creators
CREATE TABLE IF NOT EXISTS creator_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  title_id UUID REFERENCES titles(id) ON DELETE CASCADE, -- Optional: post about specific title
  content TEXT NOT NULL CHECK (length(content) > 0 AND length(content) <= 2000),
  image_url TEXT,
  
  -- Moderation
  is_hidden BOOLEAN DEFAULT false,
  hidden_by UUID REFERENCES auth.users(id),
  hidden_at TIMESTAMP WITH TIME ZONE,
  hidden_reason TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_creator_posts_creator ON creator_posts(creator_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_creator_posts_title ON creator_posts(title_id, created_at DESC);

-- =============================================
-- D) MODERATION - REPORTS
-- =============================================

-- Reported content queue
CREATE TABLE IF NOT EXISTS reported_content (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('comment', 'creator_post', 'user')),
  content_id UUID NOT NULL, -- Can reference comment_id, creator_post_id, or user_id
  reported_by UUID NOT NULL REFERENCES auth.users(id),
  reason TEXT NOT NULL CHECK (length(reason) > 0 AND length(reason) <= 500),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'actioned', 'dismissed')),
  
  -- Admin review
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reported_content_status ON reported_content(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reported_content_type ON reported_content(content_type, content_id);

-- =============================================
-- D) MODERATION - USER BANS
-- =============================================

-- User bans/suspensions
CREATE TABLE IF NOT EXISTS user_bans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  banned_by UUID NOT NULL REFERENCES auth.users(id),
  reason TEXT NOT NULL,
  ban_type VARCHAR(20) DEFAULT 'comment' CHECK (ban_type IN ('comment', 'full')), -- comment = can't comment, full = can't use platform
  expires_at TIMESTAMP WITH TIME ZONE, -- NULL = permanent
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_bans_user ON user_bans(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_user_bans_active ON user_bans(is_active, expires_at);

-- =============================================
-- D) MODERATION - BLOCKED USERS
-- =============================================

-- User blocking (user-controlled)
CREATE TABLE IF NOT EXISTS blocked_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- User who is blocking
  blocked_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- User being blocked
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, blocked_user_id)
);

CREATE INDEX IF NOT EXISTS idx_blocked_users_user ON blocked_users(user_id);

-- =============================================
-- E) ANTI-ABUSE - RATE LIMITING
-- =============================================

-- Rate limit tracking (for server-side enforcement)
CREATE TABLE IF NOT EXISTS rate_limit_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL, -- 'comment', 'report', 'reaction', etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_user ON rate_limit_events(user_id, action_type, created_at);

-- Auto-cleanup old rate limit events (keep last hour only)
-- Note: In production, use a scheduled job to clean this table

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reported_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bans ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_events ENABLE ROW LEVEL SECURITY;

-- Comments: Public read (non-hidden), authenticated write
CREATE POLICY "Public can read non-hidden comments" ON comments
  FOR SELECT USING (NOT is_hidden AND NOT is_deleted);

CREATE POLICY "Authenticated users can create comments" ON comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments" ON comments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments" ON comments
  FOR DELETE USING (auth.uid() = user_id);

-- Reactions: Public read, authenticated write
CREATE POLICY "Public can read reactions" ON comment_reactions
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage own reactions" ON comment_reactions
  FOR ALL USING (auth.uid() = user_id);

-- Creator posts: Public read (non-hidden), creators write
CREATE POLICY "Public can read non-hidden creator posts" ON creator_posts
  FOR SELECT USING (NOT is_hidden);

CREATE POLICY "Creators can manage own posts" ON creator_posts
  FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM creators WHERE id = creator_posts.creator_id)
  );

-- Reports: Users can create, admins can manage (via service role)
CREATE POLICY "Users can create reports" ON reported_content
  FOR INSERT WITH CHECK (auth.uid() = reported_by);

CREATE POLICY "Users can view own reports" ON reported_content
  FOR SELECT USING (auth.uid() = reported_by);

-- Bans: Admins only (via service role)
-- No public policies - all access via service role

-- Blocked users: Users manage own blocks
CREATE POLICY "Users can manage own blocks" ON blocked_users
  FOR ALL USING (auth.uid() = user_id);

-- Rate limit events: System only (via service role)
CREATE POLICY "Users can view own rate limit events" ON rate_limit_events
  FOR SELECT USING (auth.uid() = user_id);

-- =============================================
-- TRIGGERS & FUNCTIONS
-- =============================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_comments_updated_at ON comments;
CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_creator_posts_updated_at ON creator_posts;
CREATE TRIGGER update_creator_posts_updated_at
  BEFORE UPDATE ON creator_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_bans_updated_at ON user_bans;
CREATE TRIGGER update_user_bans_updated_at
  BEFORE UPDATE ON user_bans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- FEATURE FLAG
-- =============================================

-- Add feature flag for creator posts
INSERT INTO feature_flags (feature_name, enabled, description)
VALUES ('enable_creator_posts', false, 'Enable creator posts feature (Phase 4)')
ON CONFLICT (feature_name) DO NOTHING;

-- =============================================
-- HELPER VIEWS
-- =============================================

-- View for comments with user info and reaction counts
CREATE OR REPLACE VIEW comments_with_details AS
SELECT 
  c.id,
  c.user_id,
  c.title_id,
  c.episode_id,
  c.parent_comment_id,
  c.content,
  c.is_hidden,
  c.is_deleted,
  c.created_at,
  c.updated_at,
  -- Reaction counts
  COUNT(DISTINCT CASE WHEN cr.reaction_type = 'like' THEN cr.id END) as like_count,
  COUNT(DISTINCT CASE WHEN cr.reaction_type = 'love' THEN cr.id END) as love_count,
  COUNT(DISTINCT CASE WHEN cr.reaction_type = 'laugh' THEN cr.id END) as laugh_count,
  COUNT(DISTINCT cr.id) as total_reactions
FROM comments c
LEFT JOIN comment_reactions cr ON c.id = cr.comment_id
GROUP BY c.id;

-- =============================================
-- PHASE 4 SETUP COMPLETE
-- =============================================

-- Summary:
-- ✅ Comments system (title + episode support, 1-level replies)
-- ✅ Reactions (like, love, laugh - minimal)
-- ✅ Creator posts (optional, feature-flagged)
-- ✅ Moderation (reports, bans, blocks)
-- ✅ Anti-abuse (rate limiting tracking)
-- ✅ RLS policies for security
-- ✅ Helper views for efficient queries

-- Next steps:
-- 1. Create API routes with rate limiting
-- 2. Build non-intrusive UI components
-- 3. Integrate into Theater Mode (below video, contained)
-- 4. Add admin moderation panel

