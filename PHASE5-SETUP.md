# Phase 5 Setup Guide

## 🚀 Quick Start

Follow these steps to activate Phase 5 improvements:

---

## Step 1: Run Database Migration

### Open Supabase SQL Editor

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the entire contents of `supabase-phase5-hardening.sql`
5. Paste into the editor
6. Click **Run**

### What This Does:
- ✅ Creates `admin_users` table
- ✅ Adds 20+ performance indexes
- ✅ Creates admin check functions
- ✅ Sets up cleanup functions
- ✅ Runs ANALYZE for query optimization

**Expected Output:**
```
Success. No rows returned
```

---

## Step 2: Grant Your First Admin Access

### Find Your User ID

Run this query in Supabase SQL Editor:

```sql
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';
```

Copy your user ID (UUID format).

### Grant Admin Access

Replace `YOUR_USER_ID_HERE` with your actual user ID:

```sql
INSERT INTO admin_users (user_id, notes)
VALUES ('YOUR_USER_ID_HERE', 'Initial admin user - Phase 5 setup');
```

**Expected Output:**
```
Success. 1 row(s) affected
```

---

## Step 3: Verify Admin Access

### Test 1: Access Admin Panel

1. **Sign in** to your account (the one you just made admin)
2. Navigate to `/admin/creators` in your browser
3. **Expected:** Page loads successfully with admin interface
4. **If redirected:** Check that you used the correct user ID in Step 2

### Test 2: Non-Admin Access

1. **Sign out**
2. Try to access `/admin/creators` again
3. **Expected:** Redirected to homepage with error message
4. **Or:** Create a second test account and try accessing admin
5. **Expected:** Access denied, redirected to homepage

---

## Step 4: Restart Development Server

```bash
# Stop current server (Ctrl+C)
# Then restart:
npm run dev
```

This ensures all new code is loaded.

---

## Step 5: Test Performance Improvements

### Homepage Performance

1. Open browser DevTools (F12)
2. Go to **Network** tab
3. Reload homepage
4. Check:
   - ✅ Fewer database queries
   - ✅ Smaller payload sizes
   - ✅ Faster load time

### Database Query Test

Run this in Supabase SQL Editor to verify indexes:

```sql
-- Check that indexes were created
SELECT 
  tablename, 
  indexname 
FROM pg_indexes 
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
```

**Expected:** Should see 20+ indexes starting with `idx_`

---

## Step 6: Test Security Features

### Rate Limiting Test

**Auth Rate Limiting:**
1. Sign out
2. Try to sign in with wrong password 6 times
3. **Expected:** After 5 attempts, should be rate limited

**Upload Rate Limiting:**
1. Sign in as creator
2. Try to upload 11 videos in quick succession
3. **Expected:** After 10 uploads, should be rate limited

### Admin Protection Test

**Scenario 1: Admin User**
- Sign in as admin
- Access `/admin/creators`
- **Expected:** ✅ Access granted

**Scenario 2: Regular User**
- Sign in as non-admin
- Access `/admin/creators`
- **Expected:** ❌ Redirected to homepage

**Scenario 3: Guest**
- Not signed in
- Access `/admin/creators`
- **Expected:** ❌ Redirected to homepage

---

## Step 7: Test Monitoring Features

### Error Boundary Test

**Trigger an error (dev mode only):**

1. Open browser console
2. In any React component, add:
   ```typescript
   throw new Error('Test error boundary')
   ```
3. **Expected:** Error boundary UI appears
4. Click "Try Again" - should recover
5. Click "Go to Homepage" - should navigate home

### Logging Test

1. Open browser console
2. Play any video
3. **Expected:** See structured logs:
   ```
   [2026-01-25T...] [INFO] Playback started Context: {...}
   ```
4. Trigger an error
5. **Expected:** See error logs with stack traces

---

## Step 8: Test Keyboard Navigation

### Video Player

1. Play any video
2. Press **Space** - should pause/play
3. Press **F** - should toggle fullscreen
4. Press **M** - should mute/unmute
5. Press **Arrow Left/Right** - should seek
6. Press **Escape** - should exit fullscreen

### Sliders

1. Focus on any poster in a slider
2. Press **Arrow Right** - should move to next item
3. Press **Arrow Left** - should move to previous item
4. Press **Enter** - should play selected item

---

## Step 9: Test Mobile Responsiveness

### Desktop Browser Test

1. Open DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Select "iPhone 12 Pro" or similar
4. Navigate through app
5. **Check:**
   - ✅ Layout adapts to mobile
   - ✅ Touch gestures work on sliders
   - ✅ Theater Mode works
   - ✅ Header is mobile-friendly

### Real Mobile Test (Optional)

1. Get your local IP: `ifconfig` or `ipconfig`
2. Access `http://YOUR_IP:3000` from mobile device
3. Test navigation and playback

---

## 🎯 Success Criteria

All of these should pass:

### Performance ✅
- [ ] Homepage loads in < 2 seconds
- [ ] Continue Watching shows only recent items
- [ ] Sliders are smooth with many items
- [ ] Database queries use indexes (check with EXPLAIN)

### Security ✅
- [ ] Only admin users can access `/admin/*` routes
- [ ] Non-admins are redirected with clear message
- [ ] Rate limiting blocks excessive attempts
- [ ] Error messages don't expose sensitive data

### Monitoring ✅
- [ ] Error boundary catches and displays errors
- [ ] Structured logs appear in console
- [ ] Playback events are logged
- [ ] Upload events are logged

### App Readiness ✅
- [ ] Keyboard shortcuts work in video player
- [ ] Arrow keys navigate sliders
- [ ] Escape key closes modals
- [ ] Mobile layout works perfectly
- [ ] Touch gestures work on mobile

---

## 🔧 Troubleshooting

### Issue: "Access Denied" when accessing admin panel as admin

**Solution:**
1. Verify you inserted your user ID correctly:
   ```sql
   SELECT * FROM admin_users WHERE user_id = 'your-user-id';
   ```
2. If no results, re-run the INSERT statement
3. Clear browser cache and cookies
4. Sign out and sign in again

### Issue: Indexes not improving performance

**Solution:**
1. Run ANALYZE to update query planner:
   ```sql
   ANALYZE;
   ```
2. Verify indexes exist:
   ```sql
   SELECT * FROM pg_indexes WHERE schemaname = 'public';
   ```
3. Check query plans:
   ```sql
   EXPLAIN ANALYZE SELECT * FROM titles WHERE category = 'trending' LIMIT 20;
   ```
   Should show "Index Scan" not "Seq Scan"

### Issue: Rate limiting not working

**Solution:**
1. Check `rate_limit_events` table exists:
   ```sql
   SELECT COUNT(*) FROM rate_limit_events;
   ```
2. Verify events are being logged:
   ```sql
   SELECT * FROM rate_limit_events ORDER BY created_at DESC LIMIT 10;
   ```
3. Check rate limit configuration in code

### Issue: Error boundary not catching errors

**Solution:**
1. Verify `ErrorBoundary` is in `app/layout.tsx`
2. Errors must be in React render phase (not event handlers)
3. Check browser console for error logs
4. Try triggering error in `useEffect` or render method

### Issue: Logs not appearing

**Solution:**
1. Check browser console is open
2. Verify `logger` is imported correctly
3. Check log level (debug logs only in dev mode)
4. Look for structured format: `[timestamp] [level] message`

---

## 🎓 Admin Management

### Add Another Admin

```sql
-- Find user ID
SELECT id, email FROM auth.users WHERE email = 'new-admin@example.com';

-- Grant admin access
INSERT INTO admin_users (user_id, granted_by, notes)
VALUES (
  'new-admin-user-id',
  'your-admin-user-id',
  'Granted admin access for content management'
);
```

### Remove Admin Access

```sql
DELETE FROM admin_users WHERE user_id = 'user-id-to-remove';
```

### List All Admins

```sql
SELECT 
  au.user_id,
  u.email,
  au.granted_at,
  au.notes
FROM admin_users au
JOIN auth.users u ON u.id = au.user_id
ORDER BY au.granted_at DESC;
```

---

## 📊 Monitoring in Production

### Check Performance Metrics

```sql
-- Homepage query performance
EXPLAIN ANALYZE 
SELECT id, title, poster_url, backdrop_url, description, category, content_type, mux_playback_id, creator_id
FROM titles
WHERE category = 'trending'
ORDER BY created_at DESC
LIMIT 20;

-- Continue Watching performance
EXPLAIN ANALYZE
SELECT * FROM playback_progress
WHERE user_id = 'test-user-id'
ORDER BY updated_at DESC
LIMIT 20;
```

### Check Rate Limiting Stats

```sql
-- Auth attempts in last hour
SELECT COUNT(*) as auth_attempts
FROM rate_limit_events
WHERE action_type = 'auth_attempt'
  AND created_at > NOW() - INTERVAL '1 hour';

-- Upload attempts in last hour
SELECT COUNT(*) as uploads
FROM rate_limit_events
WHERE action_type = 'upload'
  AND created_at > NOW() - INTERVAL '1 hour';
```

### Database Maintenance

```sql
-- Clean old rate limit events (run weekly)
SELECT cleanup_old_rate_limits();

-- Clean old event logs (run monthly)
SELECT cleanup_old_event_logs();

-- Update query statistics (run daily)
ANALYZE;
```

---

## ✅ Setup Complete!

If all tests pass, Phase 5 is successfully deployed.

**Next Steps:**
1. Monitor performance metrics
2. Watch for errors in production
3. Adjust rate limits if needed
4. Grant admin access to team members
5. Set up automated database maintenance

---

**Need Help?**
- Check `PHASE5-IMPLEMENTATION.md` for detailed info
- Review `PHASE5-AUDIT.md` for what was fixed
- Check `supabase-phase5-hardening.sql` for database changes

