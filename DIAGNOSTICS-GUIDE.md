# Diagnostics Guide - Debugging Common Issues

## 🔍 How to Use This Guide

Open your browser's Developer Console (F12 or Right Click → Inspect → Console) and check for log messages.

---

## Issue 1: Community Section Empty

### What to Check

**1. Open Browser Console**
Look for this message:
```
Fetched community posts: [...]
```

**Possible Outcomes:**

✅ **If you see posts in the array:**
- Community section should display them
- If not visible, check CSS/styling issue

❌ **If you see an error:**
- RLS policy might be blocking reads
- Run this fix in Supabase SQL Editor:

```sql
-- Allow everyone to read creator posts
DROP POLICY IF EXISTS "Anyone can read creator posts" ON creator_posts;

CREATE POLICY "Anyone can read creator posts"
ON creator_posts FOR SELECT
TO public
USING (true);
```

❌ **If array is empty `[]`:**
- No posts exist in database yet
- Create a post from Creator Space
- Check feature flag:

```sql
-- Check if feature is enabled
SELECT * FROM feature_flags WHERE feature_name = 'creator_posts_enabled';

-- Enable if needed
UPDATE feature_flags 
SET enabled = true 
WHERE feature_name = 'creator_posts_enabled';
```

**2. Verify Creator Posts Exist**

Run in Supabase SQL Editor:
```sql
SELECT 
  cp.*,
  c.display_name as creator_name,
  t.title as content_title
FROM creator_posts cp
LEFT JOIN creators c ON cp.creator_id = c.id
LEFT JOIN titles t ON cp.title_id = t.id
ORDER BY cp.created_at DESC
LIMIT 10;
```

If empty → Create posts from Creator Space  
If has data → RLS policy issue (see above)

---

## Issue 2: Continue Watching Only Shows Non-Creator Content

### What to Check

**1. Open Browser Console**
Look for these messages:
```
Title progress: [...]
Episode progress: [...]
```

**2. Check for Errors**
If you see errors like:
```
Error fetching title progress: { ... }
```

**Possible Causes:**

### A. RLS Policy Blocking Creator Content

**Problem:** titles table RLS might only allow viewing own content for creators

**Fix:** Update RLS policy to allow reading all titles:

```sql
-- Drop old restrictive policy
DROP POLICY IF EXISTS "Users can view published titles" ON titles;

-- Create permissive read policy
CREATE POLICY "Anyone can read all titles"
ON titles FOR SELECT
TO public
USING (true);
```

### B. Playback Progress Not Saved

**Check if progress records exist:**

```sql
-- Check your playback progress
SELECT 
  pp.*,
  t.title,
  t.content_type,
  t.creator_id
FROM playback_progress pp
LEFT JOIN titles t ON pp.title_id = t.id
WHERE pp.user_id = auth.uid()
ORDER BY pp.updated_at DESC
LIMIT 20;
```

**If no records:**
- Play a video for at least 3 seconds
- Progress should save automatically
- Check RLS on playback_progress table

**If records exist but not showing:**
- RLS issue on titles table (see fix A above)

### C. Creator ID Field Causing Issues

Some queries might filter by creator_id unintentionally.

**Check:**
```sql
-- Verify all content is readable
SELECT id, title, content_type, creator_id 
FROM titles 
LIMIT 20;
```

If this returns data but Continue Watching doesn't, it's an RLS join issue.

**Fix:**
```sql
-- Ensure playback_progress can read associated titles
CREATE POLICY "Users can read titles they've watched"
ON titles FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT title_id 
    FROM playback_progress 
    WHERE user_id = auth.uid()
  )
  OR
  id IN (
    SELECT t.id
    FROM titles t
    JOIN seasons s ON s.series_id = t.id
    JOIN episodes e ON e.season_id = s.id
    JOIN playback_progress pp ON pp.episode_id = e.id
    WHERE pp.user_id = auth.uid()
  )
);
```

---

## Issue 3: Search Not Finding Creator Content

### What to Check

**1. Try Searching**
- Type a title you know exists
- Check if it appears

**2. Check RLS Policy**

Same as "Continue Watching" issue - RLS might block creator content from search.

**Fix:**
```sql
-- Allow public reads on titles (search needs this)
CREATE POLICY "Public can search titles"
ON titles FOR SELECT
TO public
USING (true);
```

---

## Issue 4: Profile Dropdown Not Showing Creator Space

### What to Check

**1. Open Browser Console**
Look for this in the Header component area (no specific log yet)

**2. Verify Creator Status**

Run in Supabase SQL Editor:
```sql
-- Check if you're an approved creator
SELECT * FROM creators WHERE user_id = auth.uid();
```

**Expected:**
- Should return a row with `status = 'approved'`

**If empty:**
- Apply as creator from Creator Space page
- Admin must approve you

**If status is 'pending':**
- Admin hasn't approved yet
- Go to `/admin/creators` and approve yourself (if you're admin)

**If approved but still not showing:**
- Hard refresh page (Ctrl+Shift+R or Cmd+Shift+R)
- Clear browser cache
- Sign out and sign in again

---

## Issue 5: Creator Space Not Accessible

### What to Check

**1. Check URL**
- Go to: `http://localhost:3000/creator`

**2. Check Creator Status** (same as Issue 4)

**3. Check RLS Policies**

```sql
-- Verify you can read your creator record
SELECT * FROM creators WHERE user_id = auth.uid();

-- If empty, check if you can insert
INSERT INTO creators (user_id, display_name, status)
VALUES (auth.uid(), 'Your Name', 'pending')
RETURNING *;
```

---

## 🛠️ Universal RLS Fix (Nuclear Option)

If multiple issues persist, you can temporarily make everything public for testing:

```sql
-- WARNING: Only for local development/testing!
-- DO NOT use in production without proper policies

-- Titles
DROP POLICY IF EXISTS "Public can read all titles" ON titles;
CREATE POLICY "Public can read all titles"
ON titles FOR SELECT TO public USING (true);

-- Playback Progress  
DROP POLICY IF EXISTS "Users manage own progress" ON playback_progress;
CREATE POLICY "Users manage own progress"
ON playback_progress FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Creator Posts
DROP POLICY IF EXISTS "Public can read posts" ON creator_posts;
CREATE POLICY "Public can read posts"
ON creator_posts FOR SELECT TO public USING (true);

-- Creators
DROP POLICY IF EXISTS "Public can read creators" ON creators;
CREATE POLICY "Public can read creators"
ON creators FOR SELECT TO public USING (true);
```

---

## 📊 Quick Health Check Query

Run this to get a full overview:

```sql
-- Health Check Query
SELECT 
  'Titles' as table_name,
  COUNT(*) as count,
  COUNT(DISTINCT creator_id) as unique_creators
FROM titles

UNION ALL

SELECT 
  'Creator Posts' as table_name,
  COUNT(*) as count,
  COUNT(DISTINCT creator_id) as unique_creators
FROM creator_posts

UNION ALL

SELECT 
  'Playback Progress' as table_name,
  COUNT(*) as count,
  COUNT(DISTINCT user_id) as unique_users
FROM playback_progress

UNION ALL

SELECT 
  'Creators' as table_name,
  COUNT(*) as count,
  COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count
FROM creators;
```

**Expected Output:**
- Titles: Should have some count
- Creator Posts: Should have count if you've posted
- Playback Progress: Should have count if you've watched videos
- Creators: Should show your creator record if approved

---

## 🆘 Still Having Issues?

1. **Clear all browser data** for localhost:3000
2. **Sign out and sign in** again
3. **Hard refresh** the page (Ctrl+Shift+R)
4. **Check Supabase Dashboard** → Authentication → Users (verify your user exists)
5. **Check Supabase Dashboard** → Table Editor → Browse tables for data
6. **Review RLS Policies** in Supabase Dashboard → Authentication → Policies

---

## 📝 Logging Added for Debugging

The following console logs are now in the code:

**CommunitySection.tsx:**
- `"Fetched community posts:"` - Shows what was retrieved
- `"Error fetching community posts:"` - Shows errors

**page.tsx (Continue Watching):**
- `"Title progress:"` - Shows fetched titles
- `"Error fetching title progress:"` - Shows title errors
- `"Episode progress:"` - Shows fetched episodes
- `"Error fetching episode progress:"` - Shows episode errors

**Look for these in your browser console!**

---

**Need more help?** Check the browser console first, then run the SQL queries above.
