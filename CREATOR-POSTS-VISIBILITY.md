# Creator Posts - Visibility Guide

## 📍 Where Are Creator Posts Visible?

Creator posts are displayed in a **non-intrusive side panel** within the viewing experience, following the cinema-first philosophy. They appear in:

### 1. **Creator Portal** (`/creator`)
- Creators can view all their posts
- Create new posts (text + optional image)
- Posts can be attached to specific titles
- Visible to the creator themselves

### 2. **Theater Mode** (Video Player)
- Creator posts appear in a collapsible side panel **during playback**
- Shows posts from the creator of the currently playing content
- Does NOT interrupt playback
- Can be toggled on/off by viewers
- Sorted by newest first

### 3. **NOT on Homepage**
- Creator posts do **NOT** appear in a social feed on the homepage
- No infinite scroll of posts
- No notifications or badges
- Keeps the homepage focused on content discovery

---

## 👤 Who Can See Creator Posts?

### Public Viewing:
- ✅ **All users** (logged in or guest) can **read** creator posts
- ✅ Posts are visible in Theater Mode while watching content
- ✅ Posts are visible on the creator's portal page

### Creating Posts:
- ❌ Only **approved creators** can create posts
- ✅ Creators manage their posts from `/creator` page
- ✅ Rate limited to prevent spam (configurable in code)

---

## 🎬 Creator Post Format

Each post contains:
- **Content**: Text (max 2000 characters)
- **Image URL**: Optional image attachment
- **Title**: Optional link to specific title/series
- **Timestamp**: When the post was created

---

## 🛡️ Moderation

Admin controls:
- Hide/unhide creator posts
- Delete creator posts
- Ban creators from posting
- View reported posts

User controls:
- Report inappropriate posts

---

## 🎯 Philosophy

Creator posts are designed to:
- ✅ Allow creators to communicate with their audience
- ✅ Provide behind-the-scenes context about content
- ✅ NOT distract from the cinema-first viewing experience
- ✅ NOT create a social media feed
- ✅ Stay minimal and focused

---

## 🔧 Feature Flag

Creator posts can be enabled/disabled via:

```sql
UPDATE feature_flags 
SET enabled = true 
WHERE feature_name = 'enable_creator_posts';
```

Check status in admin settings (`/admin/settings`).

---

## 📊 Current Status

Creator posts are now live with:
- ✅ Authentication fixed (RLS policies working)
- ✅ Visible in creator portal
- ✅ Visible in Theater Mode (toggle with "📢 Creator Updates" button)
- ✅ Rate limiting active
- ✅ Moderation tools ready
- ✅ Read-only mode in Theater (no post form, just viewing)

