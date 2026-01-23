-- =============================================
-- User Profiles - Display Names for Comments
-- =============================================
-- This adds user profiles with display names so users can customize
-- how they appear in comments instead of showing "User {id}"

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  display_name VARCHAR(50) NOT NULL CHECK (length(display_name) >= 2 AND length(display_name) <= 50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

-- RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Anyone can read profiles (for displaying names in comments)
CREATE POLICY "Public can read user profiles" ON user_profiles
  FOR SELECT USING (true);

-- Users can create their own profile
CREATE POLICY "Users can create own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- PROFILE SETUP COMPLETE
-- =============================================

-- Users can now set display names at /profile
-- Comments will show display_name instead of "User {id}"

