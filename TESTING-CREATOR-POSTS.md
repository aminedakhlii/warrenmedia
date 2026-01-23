# Testing Creator Posts

Creator Posts is an **optional feature** in Phase 4 that's disabled by default. Here's how to enable and test it.

---

## 🔧 Step 1: Enable the Feature

### In Supabase SQL Editor:

```sql
UPDATE feature_flags 
SET enabled = true 
WHERE feature_name = 'enable_creator_posts';
```

Or check current status:

```sql
SELECT * FROM feature_flags WHERE feature_name = 'enable_creator_posts';
```

---

## 👤 Step 2: Become an Approved Creator

### Option A: If You Already Have a Creator Account

1. Check your status in Supabase:
   ```sql
   SELECT * FROM creators WHERE user_id = 'your-user-id';
   ```

2. If status is `pending`, approve yourself:
   ```sql
   UPDATE creators 
   SET status = 'approved' 
   WHERE user_id = 'your-user-id';
   ```

### Option B: Create a New Creator Application

1. **Sign in** to Warren Media
2. **Visit** `/creator` 
3. **Fill out** the creator application form:
   - Display Name
   - Bio
   - Why you want to be a creator (optional)
4. **Submit** application

5. **Approve yourself** in Supabase:
   ```sql
   -- Find your application
   SELECT * FROM creators WHERE status = 'pending' ORDER BY created_at DESC LIMIT 1;
   
   -- Approve it (use the ID from above)
   UPDATE creators 
   SET status = 'approved' 
   WHERE id = 'creator-id-here';
   ```

---

## 📝 Step 3: Create Your First Post

### On Creator Page:

1. **Go to** `/creator`
2. You should see your creator dashboard
3. Look for **"Creator Updates"** section
4. Click **"+ New Post"** button
5. **Fill in:**
   - Content (max 2000 characters)
   - Image URL (optional)
6. Click **"Post Update"**

### What You Should See:

- ✅ Success message: "Post created!"
- Your post appears in the list immediately
- Post shows:
  - Timestamp
  - Content
  - Image (if provided)

---

## 👀 Step 4: View Creator Posts

### Where Posts Appear:

Currently, Creator Posts are only visible in the **Creator Portal** at `/creator`.

In a full implementation, you could add the `CreatorPosts` component to:
- Title detail pages (pass `titleId`)
- Creator profile pages (pass `creatorId`)

### Example Integration:

```tsx
import CreatorPosts from './components/CreatorPosts'

// On a title page
<CreatorPosts titleId="title-id" />

// On a creator profile page
<CreatorPosts creatorId="creator-id" />
```

---

## 🧪 Testing Checklist

### Basic Functionality:

- [ ] Enable feature flag
- [ ] Become approved creator
- [ ] Visit `/creator`
- [ ] See "Creator Updates" section
- [ ] Click "+ New Post"
- [ ] Fill in content
- [ ] Optionally add image URL
- [ ] Submit post
- [ ] Post appears in list
- [ ] Timestamp is correct

### Rate Limiting:

- [ ] Create 3 posts quickly
- [ ] Try to create 4th post within same hour
- [ ] Should see rate limit error
- [ ] Wait 1 hour
- [ ] Can create posts again

### Image Support:

- [ ] Create post with image URL
- [ ] Image loads correctly
- [ ] Image has proper styling
- [ ] Works with various image formats

### Feature Flag:

- [ ] Disable feature flag:
   ```sql
   UPDATE feature_flags 
   SET enabled = false 
   WHERE feature_name = 'enable_creator_posts';
   ```
- [ ] Reload `/creator` page
- [ ] "Creator Updates" section disappears
- [ ] Re-enable to restore functionality

---

## 📊 Database Queries

### View All Posts:

```sql
SELECT * FROM creator_posts 
ORDER BY created_at DESC;
```

### View Posts by Creator:

```sql
SELECT cp.*, c.name as creator_name 
FROM creator_posts cp
JOIN creators c ON c.id = cp.creator_id
WHERE cp.creator_id = 'your-creator-id'
ORDER BY created_at DESC;
```

### View Posts for a Title:

```sql
SELECT * FROM creator_posts 
WHERE title_id = 'your-title-id'
ORDER BY created_at DESC;
```

### Check Hidden Posts:

```sql
SELECT * FROM creator_posts 
WHERE is_hidden = true;
```

---

## 🎨 Customization Ideas

### Add Creator Posts to Title Pages:

In your title detail page component:

```tsx
import CreatorPosts from '../components/CreatorPosts'

// Inside your component
<div className="mt-8">
  <CreatorPosts titleId={title.id} />
</div>
```

### Add to Homepage (NOT Recommended):

⚠️ **Phase 4 Guidelines:** Creator Posts should NOT appear on homepage to maintain cinema-first experience.

If you really want to add them elsewhere:
- Keep them in a side panel
- Don't make them prominent
- Ensure they're optional and dismissible

---

## 🔐 Moderation

### Hide a Creator Post:

Admins can hide posts at `/admin/moderation` or via SQL:

```sql
UPDATE creator_posts 
SET is_hidden = true,
    hidden_by = 'admin-user-id',
    hidden_at = NOW(),
    hidden_reason = 'Inappropriate content'
WHERE id = 'post-id';
```

### View Hidden Posts (Admin):

```sql
SELECT * FROM creator_posts 
WHERE is_hidden = true
ORDER BY hidden_at DESC;
```

---

## 🚫 Rate Limiting

Creator Posts are rate limited to **3 posts per hour** per creator.

### Check Rate Limit Events:

```sql
SELECT * FROM rate_limit_events 
WHERE user_id = 'your-user-id' 
  AND action_type = 'creator_post'
  AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

### Reset Rate Limit (Testing):

```sql
DELETE FROM rate_limit_events 
WHERE user_id = 'your-user-id' 
  AND action_type = 'creator_post';
```

---

## ⚠️ Current Limitations

1. **No Edit:** Posts can't be edited, only deleted
2. **No Rich Text:** Plain text only (with line breaks)
3. **Image URLs Only:** No file upload, must provide URL
4. **No Likes/Comments:** Posts don't have engagement features
5. **Limited Visibility:** Only shows in creator portal by default

---

## 🔮 Future Enhancements

Possible additions:
- [ ] Edit functionality
- [ ] Rich text editor
- [ ] Image upload (not just URLs)
- [ ] Post scheduling
- [ ] Analytics (views, engagement)
- [ ] Post to specific audience
- [ ] Pinned posts
- [ ] Post categories/tags

---

## ✅ Success Criteria

You've successfully tested Creator Posts if:

1. ✅ Feature flag enabled
2. ✅ Approved as creator
3. ✅ Can create posts with content
4. ✅ Can add optional images
5. ✅ Posts appear immediately
6. ✅ Rate limiting works (3 per hour)
7. ✅ Feature disappears when flag disabled
8. ✅ Admin can hide posts

---

## 💡 Tips

1. **Test with Multiple Creators:** Create several creator accounts to test different scenarios
2. **Use Test Images:** Try various image URLs to test loading and styling
3. **Test Long Content:** Create posts with max characters (2000) to test UI
4. **Test Empty State:** Disable posts to see empty state message
5. **Check Mobile:** Creator posts should be responsive

---

## 🐛 Troubleshooting

### "Creator posts feature is disabled" error:
- Check feature flag in database
- Ensure `enabled = true`

### "Only approved creators can post" error:
- Check creator status: `SELECT status FROM creators WHERE user_id = 'your-user-id'`
- Should be `approved`, not `pending` or `rejected`

### Rate limit errors:
- Check recent posts: `SELECT created_at FROM creator_posts WHERE creator_id = 'your-creator-id' ORDER BY created_at DESC LIMIT 3`
- If 3 posts in last hour, wait until oldest is >1 hour old

### Image not loading:
- Verify URL is accessible
- Check for HTTPS (not HTTP)
- Try different image URL
- Check browser console for CORS errors

---

## 📝 Notes

- Creator Posts is an **optional feature** - keep disabled unless needed
- Respects cinema-first philosophy - no homepage presence
- Static content only - no autoplay or dynamic features
- Designed to be non-intrusive and contained

---

That's it! You now know how to test Creator Posts. 🎉

