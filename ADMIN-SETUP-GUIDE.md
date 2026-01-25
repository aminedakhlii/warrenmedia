# 🔐 Admin Setup Guide - Step by Step

## ⚠️ Important: You MUST complete these steps to access admin routes

---

## Step 1: Run the Fixed Database Migration

### Open Supabase Dashboard

1. Go to your Supabase project dashboard
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**

### Run the Phase 5 Script

1. Open the file `supabase-phase5-hardening.sql` in your editor
2. Copy **ALL** the contents (Cmd+A or Ctrl+A, then Cmd+C or Ctrl+C)
3. Paste into Supabase SQL Editor
4. Click **Run** button (or press Cmd+Enter / Ctrl+Enter)

### Expected Output

You should see:
```
Success. No rows returned
```

If you see an error, copy the error message and let me know.

---

## Step 2: Find Your User ID

### In Supabase SQL Editor, run this query:

```sql
SELECT id, email FROM auth.users;
```

### You'll see output like:

| id | email |
|----|-------|
| 12345678-1234-1234-1234-123456789abc | your-email@example.com |
| 87654321-4321-4321-4321-cba987654321 | other-user@example.com |

**Copy your user ID** (the UUID that looks like `12345678-1234-1234-1234-123456789abc`)

---

## Step 3: Grant Yourself Admin Access

### In Supabase SQL Editor, run this query:

**Replace `YOUR_USER_ID_HERE` with your actual user ID from Step 2:**

```sql
INSERT INTO admin_users (user_id, notes)
VALUES ('YOUR_USER_ID_HERE', 'Initial admin - created during Phase 5 setup');
```

### Example (with a real UUID):

```sql
INSERT INTO admin_users (user_id, notes)
VALUES ('12345678-1234-1234-1234-123456789abc', 'Initial admin - created during Phase 5 setup');
```

### Expected Output

```
Success. 1 row(s) affected
```

---

## Step 4: Verify Admin Access

### Check that your admin was created:

```sql
SELECT 
  au.user_id,
  u.email,
  au.granted_at,
  au.notes
FROM admin_users au
JOIN auth.users u ON u.id = au.user_id;
```

### You should see:

| user_id | email | granted_at | notes |
|---------|-------|------------|-------|
| your-user-id | your-email@example.com | 2026-01-25... | Initial admin... |

---

## Step 5: Test Admin Access

### 1. Restart Your Dev Server

```bash
# In terminal, press Ctrl+C to stop the server
# Then restart:
npm run dev
```

### 2. Sign In to Your Account

1. Open your app in browser: `http://localhost:3000`
2. Click **Sign In**
3. Sign in with the email you granted admin access to
4. You should be signed in successfully

### 3. Access Admin Panel

Try to access an admin route:
```
http://localhost:3000/admin/creators
```

**✅ Expected Result:** Page loads with admin interface

**❌ If you get redirected:** 
- Check you signed in with the correct account
- Verify you used the correct user ID in Step 3
- Clear browser cache and try again

### 4. Test Protection (Sign Out)

1. Sign out of your account
2. Try to access `http://localhost:3000/admin/creators` again
3. **Expected:** You should be redirected to homepage with error message

---

## 🎯 Quick Reference

### All Admin Routes

Once you're signed in as admin, you can access:

- `/admin/creators` - Manage creator applications
- `/admin/titles` - Manage content (add/edit/delete titles)
- `/admin/settings` - Feature flags and settings
- `/admin/analytics` - View platform analytics
- `/admin/ads` - Configure pre-roll ads
- `/admin/moderation` - Moderate comments and users

### Add More Admins

To grant admin access to another user:

```sql
-- 1. Find their user ID
SELECT id, email FROM auth.users WHERE email = 'new-admin@example.com';

-- 2. Grant them admin access
INSERT INTO admin_users (user_id, granted_by, notes)
VALUES (
  'their-user-id-here',
  'your-user-id',  -- The ID of who is granting access (you)
  'Reason for granting admin access'
);
```

### Remove Admin Access

To revoke admin access from a user:

```sql
DELETE FROM admin_users WHERE user_id = 'user-id-to-remove';
```

### List All Admins

To see all current admins:

```sql
SELECT 
  u.email,
  au.granted_at,
  au.notes
FROM admin_users au
JOIN auth.users u ON u.id = au.user_id
ORDER BY au.granted_at;
```

---

## 🐛 Troubleshooting

### Problem: "Access Denied" even though I'm admin

**Solutions:**
1. Clear browser cache and cookies
2. Sign out completely and sign in again
3. Verify in database:
   ```sql
   SELECT * FROM admin_users WHERE user_id = 'your-user-id';
   ```
4. If no results, re-run the INSERT statement from Step 3

### Problem: SQL Error when running migration

**Solutions:**
1. Make sure you copied the **entire** SQL file
2. Check that you're using the **fixed** version (after my updates)
3. Run queries one section at a time to find which fails
4. Share the error message with me

### Problem: Can't find my user ID

**Solutions:**
1. Make sure you've created an account on the platform
2. Check if email confirmation is required (Supabase → Authentication → Settings)
3. Run this query to see all users:
   ```sql
   SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC;
   ```

### Problem: "relation admin_users does not exist"

**Solution:**
You didn't run the Phase 5 migration script. Go back to Step 1.

---

## ✅ Success Checklist

- [ ] Ran `supabase-phase5-hardening.sql` in Supabase SQL Editor
- [ ] Found my user ID
- [ ] Granted myself admin access
- [ ] Verified admin was created in database
- [ ] Restarted dev server
- [ ] Signed in with admin account
- [ ] Successfully accessed `/admin/creators`
- [ ] Tested that non-admins cannot access admin routes

---

## 📚 Additional Resources

- **PHASE5-SUMMARY.md** - Overview of all Phase 5 changes
- **PHASE5-SETUP.md** - Detailed setup instructions
- **PHASE5-IMPLEMENTATION.md** - Technical details

---

## 🆘 Still Having Issues?

If you're still having trouble:

1. Check the browser console for errors (F12 → Console)
2. Check the terminal for server errors
3. Verify database migration completed successfully
4. Share the specific error messages you're seeing

---

**Status:** Ready to set up admin access!  
**Time Required:** ~5 minutes  
**Difficulty:** Easy (just copy/paste SQL queries)

