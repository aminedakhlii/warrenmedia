# Phase 2 Migration Guide

This guide will help you migrate from Phase 1 to Phase 2 of Warren Media Streaming.

## ⚠️ Breaking Changes

Phase 2 introduces authentication and new database structure. **Your existing database will need to be migrated.**

## 🔄 Migration Steps

### 1. Backup Your Data

Before proceeding, **backup your existing titles and playback progress**:

```sql
-- In Supabase SQL Editor, run:
SELECT * FROM titles;
SELECT * FROM playback_progress;
```

Save this data somewhere safe.

### 2. Run Phase 2 Schema

**Choose the correct script based on your situation:**

#### If you have existing Phase 1 data (titles and progress):
Run `supabase-migration-phase1-to-phase2.sql` in your Supabase SQL Editor.

This will:
- Add `content_type` column to existing titles table
- Make `mux_playback_id` nullable (for series)
- Add `description` column
- Create `seasons` and `episodes` tables
- **Backup and recreate** `playback_progress` table (old progress will be saved in `playback_progress_phase1_backup`)
- Update all RLS policies

#### If you're starting fresh (no Phase 1 data):
Run `supabase-schema-phase2.sql` in your Supabase SQL Editor.

This creates all tables from scratch with the correct Phase 2 structure.

### 3. Enable Email Auth in Supabase

1. Go to **Authentication** → **Providers** in Supabase
2. Enable **Email** provider
3. Configure email templates (optional)

### 4. Update Environment Variables

Your `.env.local` should remain the same:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

No additional variables needed!

### 5. Data Migration

If you ran the migration script (`supabase-migration-phase1-to-phase2.sql`):

✅ **Automatic:**
- All existing titles are automatically set to `content_type = 'film'`
- Old playback progress is backed up to `playback_progress_phase1_backup`
- New playback_progress table requires authentication

⚠️ **Important Notes:**
- Phase 1 playback progress will NOT be migrated to Phase 2 (different schema)
- Users must create accounts to save progress going forward
- Old progress data is preserved in backup table for reference
- Your title data (films) remains intact and will work immediately

### 6. Verify Migration Success

In Supabase SQL Editor, run these queries to verify:

```sql
-- Check titles have content_type
SELECT COUNT(*), content_type FROM titles GROUP BY content_type;
-- Should show all your titles as 'film'

-- Check new tables exist
SELECT COUNT(*) FROM seasons;
SELECT COUNT(*) FROM episodes;
-- Should return 0 (empty but tables exist)

-- Check old progress was backed up
SELECT COUNT(*) FROM playback_progress_phase1_backup;
-- Should show your old progress count

-- Check new progress table
SELECT COUNT(*) FROM playback_progress;
-- Should be 0 (empty, ready for authenticated users)
```

### 7. Test Your Migration

1. Start the dev server: `npm run dev`
2. Visit `http://localhost:3000`
3. You should see:
   - Header with "Sign In" button
   - Your existing titles displaying correctly
   - No Continue Watching row (no progress yet)
4. Create an account and sign in
5. Play a video and verify progress saves
6. Refresh page - Continue Watching should appear
7. Sign out and verify Continue Watching disappears
8. Play as guest and verify progress doesn't save

## 🆕 What's New in Phase 2

### Authentication
- Email/password sign up and sign in
- User-specific playback progress
- Guest users can browse but can't save progress

### Content Types
- **Film**: Single video (like Phase 1)
- **Series**: TV shows with seasons and episodes
- **Music Video**: Same as film, appears in Music Videos category
- **Podcast**: Audio-only content with static artwork

### Series Management
- Create series titles
- Add seasons to series
- Add episodes to seasons
- Episode selector inside Theater Mode
- Resume works per-episode

### Theater Mode Enhancements
- Episode selector overlay for series
- Audio player mode for podcasts
- "Sign in to save progress" notice for guests

### Admin Improvements
- Two-tab interface: Titles and Series Management
- Dedicated series/season/episode workflow
- Content type selection
- Description field for better metadata

## 📊 Database Schema Changes

### New Tables

**seasons**
```sql
id              UUID PRIMARY KEY
series_id       UUID → titles(id)
season_number   INTEGER
title           TEXT
created_at      TIMESTAMP
```

**episodes**
```sql
id              UUID PRIMARY KEY
season_id       UUID → seasons(id)
episode_number  INTEGER
title           TEXT
mux_playback_id TEXT
runtime_seconds INTEGER
description     TEXT
created_at      TIMESTAMP
```

### Modified Tables

**titles**
- Added: `content_type` (film | series | music_video | podcast)
- Changed: `mux_playback_id` now nullable (series don't have direct playback IDs)
- Added: `description` field
- Updated: `category` can now be 'music_videos'

**playback_progress**
- Added: `user_id` (required, references auth.users)
- Changed: `title_id` now nullable
- Added: `episode_id` (nullable, for series episodes)
- RLS: Now restricted to authenticated users only

## 🧪 Testing Checklist

### Authentication
- [ ] Sign up with email/password
- [ ] Sign in with existing account
- [ ] Sign out
- [ ] Browse as guest (no sign in)

### Content Types
- [ ] Add a film
- [ ] Add a music video
- [ ] Add a podcast
- [ ] Add a series with seasons and episodes

### Playback
- [ ] Play a film as logged-in user
- [ ] Verify resume works for logged-in user
- [ ] Play content as guest
- [ ] Verify guest progress doesn't save
- [ ] Play a series and switch episodes
- [ ] Resume an episode
- [ ] Play a podcast (audio-only)

### Continue Watching
- [ ] Verify Continue Watching appears for logged-in users
- [ ] Verify Continue Watching doesn't appear for guests
- [ ] Verify it updates after watching content

## 🐛 Troubleshooting

### "Failed to save progress"
- Check that you're logged in
- Verify RLS policies are correctly applied
- Check browser console for specific errors

### Episodes not loading
- Verify seasons are created first
- Check that mux_playback_id is set for each episode
- Verify foreign key relationships

### Auth not working
- Verify Email provider is enabled in Supabase
- Check that NEXT_PUBLIC_SUPABASE_URL is correct
- Ensure anon key has proper permissions

### Guest users seeing Continue Watching
- This shouldn't happen - verify the user state check
- Clear browser localStorage and try again

## 📝 Notes

- Phase 1 playback progress is NOT migrated to Phase 2
- Users must create accounts to save progress going forward
- Old Phase 1 data (titles) can be kept if migrated properly
- No social logins in Phase 2 (only email/password)

## 🚀 Deploy to Production

After testing locally:

1. Push changes to GitHub
2. Vercel will automatically deploy
3. Run Phase 2 schema in production Supabase
4. Test authentication in production
5. Notify users that accounts are now required for resume playback

---

**Questions or issues?** Check the main README or Phase 2 specifications.

