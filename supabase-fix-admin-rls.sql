-- Fix infinite recursion in admin_users RLS policies
-- Run this in Supabase SQL Editor once

-- 1. Drop the recursive policies
DROP POLICY IF EXISTS "Only admins can view admin list" ON admin_users;
DROP POLICY IF EXISTS "Only admins can grant admin" ON admin_users;

-- 2. SELECT: users can read only their own row (no self-reference, no recursion)
CREATE POLICY "Users can read own admin row" ON admin_users
  FOR SELECT USING (auth.uid() = user_id);

-- 3. INSERT: only existing admins can add new admins (use SECURITY DEFINER function to avoid recursion)
-- Ensure the function exists (from Phase 5)
CREATE OR REPLACE FUNCTION is_admin(check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = check_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY "Admins can grant admin" ON admin_users
  FOR INSERT WITH CHECK (is_admin(auth.uid()));
