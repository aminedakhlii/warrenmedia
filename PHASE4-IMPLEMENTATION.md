# Phase 4: Community (Cinema-First, Non-Noisy)

## ✅ Implementation Complete

Phase 4 adds **light community features** that complement viewing without turning Warren Media into a social network. All features are contained, optional, and secondary to the cinema experience.

---

## 🔒 Core Principles (LOCKED)

### What Was NOT Built (By Design):
- ❌ Homepage social feed
- ❌ Community features that interrupt playback
- ❌ Theater Mode redesign
- ❌ Infinite scroll feeds
- ❌ Autoplay content
- ❌ UI clutter or visual noise
- ❌ Direct messages
- ❌ Friends/followers
- ❌ Social graphs
- ❌ Trending feeds
- ❌ Livestreams
- ❌ Badges, streaks, or gamification

### What WAS Built:
- ✅ Comments (title + episode support)
- ✅ Minimal reactions (3 types max)
- ✅ Creator posts (optional, feature-flagged)
- ✅ Moderation tools
- ✅ Anti-abuse & rate limiting

---

## 🎯 Features Implemented

### A) COMMENTS SYSTEM

**Location:** Inside Theater Mode (collapsible panel below video)

**Features:**
- Comments attach to titles and optionally episodes
- Flat structure (no nested threads)
- No live updating while watching
- Authenticated users can comment, guests read-only
- Max 1000 characters per comment
- Newest-first sorting

**UI:**
- Comments button in theater controls (💬 Comments)
- Collapsible panel at bottom of screen (max 50vh height)
- Non-intrusive, doesn't overlay video
- Hidden by default, user-controlled

**Rate Limiting:**
- 5 comments per minute per user
- Server-side enforcement
- Duplicate detection (blocks same comment within 1 minute)

**API Endpoints:**
- `GET /api/comments?titleId=...&episodeId=...`
- `POST /api/comments` - Create comment
- `DELETE /api/comments?id=...` - Delete own comment

### B) REACTIONS (MINIMAL)

**Types:** 3 reactions max
- 👍 Like
- ❤️ Love
- 😂 Laugh

**Behavior:**
- One reaction per user per comment
- Toggle on/off (click again to remove)
- No animations, no emoji wall
- Reaction counts displayed next to button

**Rate Limiting:**
- 20 reactions per minute per user

**API Endpoints:**
- `POST /api/comments/react` - Toggle reaction

### C) CREATOR POSTS (OPTIONAL, FEATURE-FLAGGED)

**Feature Flag:** `enable_creator_posts` (default: disabled)

**Features:**
- Static announcements from creators
- Text + optional image
- Tied to creator or specific title
- Max 2000 characters
- No feed, no takeover UI, no notifications

**UI:**
- Side panel component (when enabled)
- Can be embedded in creator pages or title details
- Does not appear on homepage

**Rate Limiting:**
- 3 posts per hour per creator

**API Endpoints:**
- `GET /api/creator-posts?creatorId=...&titleId=...`
- `POST /api/creator-posts` - Create post (creators only)

### D) MODERATION

**Admin Panel:** `/admin/moderation`

**Two Tabs:**

1. **Reported Content Queue**
   - View all reports (pending, reviewed, dismissed)
   - See reported content with context
   - Actions:
     - Hide content (comments/creator posts)
     - Ban user
     - Dismiss report
   - Track review history

2. **User Bans**
   - View active bans
   - Ban users by email
   - Set ban duration (temporary or permanent)
   - Ban type: comment ban or full ban
   - Remove bans

**User Controls:**
- Report comment/post (button in dropdown menu)
- Block user (optional, not yet implemented)

**API Endpoints:**
- `POST /api/reports` - Submit report

### E) ANTI-ABUSE & RATE LIMITING

**Rate Limits (Server-Side):**
- Comments: 5 per minute
- Reactions: 20 per minute
- Reports: 10 per hour
- Creator posts: 3 per hour

**Spam Prevention:**
- Duplicate content detection
- Rate limit event tracking
- Ban checks before posting

**Database:**
- `rate_limit_events` table tracks all rate-limited actions
- Auto-cleanup recommended (keep last hour only)

---

## 📊 Database Schema

### New Tables:

1. **comments**
   - `id`, `user_id`, `title_id`, `episode_id`, `parent_comment_id`
   - `content` (max 1000 chars)
   - `is_hidden`, `is_deleted`, `hidden_by`, `hidden_reason`
   - `created_at`, `updated_at`

2. **comment_reactions**
   - `id`, `comment_id`, `user_id`, `reaction_type`
   - UNIQUE constraint: one reaction per user per comment

3. **creator_posts**
   - `id`, `creator_id`, `title_id`, `content`, `image_url`
   - `is_hidden`, `hidden_by`, `hidden_reason`
   - `created_at`, `updated_at`

4. **reported_content**
   - `id`, `content_type`, `content_id`, `reported_by`
   - `reason`, `status`, `reviewed_by`, `admin_notes`
   - `created_at`, `reviewed_at`

5. **user_bans**
   - `id`, `user_id`, `banned_by`, `reason`
   - `ban_type`, `expires_at`, `is_active`
   - `created_at`, `updated_at`

6. **blocked_users**
   - `id`, `user_id`, `blocked_user_id`
   - UNIQUE constraint: one block per user pair

7. **rate_limit_events**
   - `id`, `user_id`, `action_type`, `created_at`
   - Used for server-side rate limit tracking

### Helper Views:

- `comments_with_details` - Comments with reaction counts aggregated

---

## 🔐 Row Level Security

All tables have RLS enabled with appropriate policies:

- **Comments:** Public read (non-hidden), authenticated write, users can update/delete own
- **Reactions:** Public read, users manage own reactions
- **Creator Posts:** Public read (non-hidden), creators manage own posts
- **Reports:** Users create and view own reports, admin manages via service role
- **Bans:** Admin only (via service role)
- **Blocked Users:** Users manage own blocks
- **Rate Limits:** System only, users can view own events

---

## 🎨 UI/UX Implementation

### Theater Mode Integration

**Comments Panel:**
- Toggle button in video controls: "💬 Comments"
- Panel slides up from bottom (max 50vh)
- Black/95 background with backdrop blur
- Scrollable, doesn't block video
- Can be dismissed anytime

**Behavior:**
- Hidden by default (respects cinema-first)
- No interruption to playback
- No overlays on video
- Keyboard controls still work

### Comments UI:
- Clean, minimal design
- User email + timestamp
- Reaction buttons (no animations)
- Actions menu (⋮) for delete/report
- Character counter (x/1000)
- Auto-refreshes after actions

### No Homepage Changes:
- ✅ No social feed on homepage
- ✅ No community widgets
- ✅ No trending/popular sections
- ✅ Homepage remains unchanged

---

## 🧪 Testing Checklist

### Comments Test:
- [ ] Click "💬 Comments" button in Theater Mode
- [ ] Panel appears below video (doesn't block playback)
- [ ] Can post comment (if logged in)
- [ ] Guest sees "Sign in to join conversation"
- [ ] Comment appears in list immediately
- [ ] Can delete own comment
- [ ] Can report others' comments
- [ ] Comments specific to episode (for series)

### Reactions Test:
- [ ] Click 👍 Like on a comment
- [ ] Count increases by 1
- [ ] Button highlighted (amber glow)
- [ ] Click again to remove (toggle off)
- [ ] Count decreases by 1
- [ ] Try ❤️ Love and 😂 Laugh
- [ ] Only one reaction per comment active at time

### Rate Limiting Test:
- [ ] Post 5 comments quickly
- [ ] 6th comment blocked with error message
- [ ] Wait 1 minute
- [ ] Can post again
- [ ] Same for reactions (20 limit)
- [ ] Same for reports (10/hour limit)

### Moderation Test:
- [ ] Go to `/admin/moderation`
- [ ] See reported content queue
- [ ] Click "Hide Content" on a report
- [ ] Content no longer visible to users
- [ ] Report marked as "actioned"
- [ ] Ban a user
- [ ] User cannot post comments
- [ ] Error shown: "You are banned from posting"

### Creator Posts Test (if enabled):
- [ ] Enable `enable_creator_posts` feature flag
- [ ] Creator can create post
- [ ] Post shows on creator page/title page
- [ ] Static content (text + optional image)
- [ ] No autoplay, no takeover
- [ ] Rate limited to 3 posts per hour

### Anti-Abuse Test:
- [ ] Try posting duplicate comment
- [ ] Blocked with "Duplicate comment detected"
- [ ] Banned user tries to comment
- [ ] Blocked with ban message
- [ ] Spam 10 reports in a minute
- [ ] Rate limit kicks in

---

## 🚀 Activation Guide

### Step 1: Run Database Migration

```bash
# In Supabase SQL Editor, run:
supabase-schema-phase4.sql
```

This creates all tables, policies, triggers, and feature flags.

### Step 2: Verify Feature Flags

```sql
SELECT * FROM feature_flags WHERE feature_name = 'enable_creator_posts';
```

- `enable_creator_posts` should be `false` by default
- Set to `true` to enable creator posts feature

### Step 3: Test Comments

1. Play any video from homepage
2. Look for "💬 Comments" button in controls
3. Click to open comments panel
4. Post a comment (if logged in)
5. Test reactions and reporting

### Step 4: Test Moderation

1. Report a test comment as a user
2. Go to `/admin/moderation`
3. See report in queue
4. Test hide/ban/dismiss actions

### Step 5: Enable Creator Posts (Optional)

```sql
UPDATE feature_flags 
SET enabled = true 
WHERE feature_name = 'enable_creator_posts';
```

---

## 📝 API Reference

### Comments API

```typescript
// GET /api/comments
GET /api/comments?titleId={id}&episodeId={id}&userId={id}
Response: { comments: CommentWithDetails[] }

// POST /api/comments
POST /api/comments
Body: { titleId, episodeId?, content, parentCommentId? }
Response: { comment: Comment }
Rate Limit: 5/minute

// DELETE /api/comments
DELETE /api/comments?id={id}
Response: { success: true }
```

### Reactions API

```typescript
// POST /api/comments/react
POST /api/comments/react
Body: { commentId, reactionType: 'like' | 'love' | 'laugh' }
Response: { action: 'added' | 'removed' | 'updated', reactionType }
Rate Limit: 20/minute
```

### Reports API

```typescript
// POST /api/reports
POST /api/reports
Body: { contentType: 'comment' | 'creator_post' | 'user', contentId, reason }
Response: { report: ReportedContent }
Rate Limit: 10/hour
```

### Creator Posts API

```typescript
// GET /api/creator-posts
GET /api/creator-posts?creatorId={id}&titleId={id}
Response: { posts: CreatorPost[] }

// POST /api/creator-posts
POST /api/creator-posts
Body: { content, imageUrl?, titleId? }
Response: { post: CreatorPost }
Rate Limit: 3/hour
Requires: Approved creator status
```

---

## 🛡️ Security Features

### Rate Limiting:
- All enforced server-side
- Tracked in `rate_limit_events` table
- Different limits for different actions
- 429 status code returned when exceeded

### Ban System:
- Server-side check before any action
- Temporary or permanent bans
- Ban types: comment or full
- Expires automatically if duration set

### Content Moderation:
- Soft delete (is_deleted flag)
- Hidden content (is_hidden flag)
- Audit trail (hidden_by, hidden_at, hidden_reason)
- Report queue for admin review

### RLS Policies:
- Users can only delete own comments
- Users can only react once per comment
- Creators can only manage own posts
- Admins manage moderation via service role

---

## 🔧 Configuration

### Feature Flags:

```sql
-- Enable/disable creator posts
UPDATE feature_flags 
SET enabled = true/false 
WHERE feature_name = 'enable_creator_posts';
```

### Rate Limits (in code):

```typescript
// app/api/comments/route.ts
const COMMENT_RATE_LIMIT = 5
const RATE_LIMIT_WINDOW_MINUTES = 1

// app/api/comments/react/route.ts
const REACTION_RATE_LIMIT = 20

// app/api/reports/route.ts
const REPORT_RATE_LIMIT = 10
const RATE_LIMIT_WINDOW_MINUTES = 60

// app/api/creator-posts/route.ts
const POST_RATE_LIMIT = 3
const RATE_LIMIT_WINDOW_MINUTES = 60
```

Adjust these in the respective API route files if needed.

---

## 📈 Monitoring

### Database Queries for Monitoring:

```sql
-- Active comments count
SELECT COUNT(*) FROM comments 
WHERE NOT is_deleted AND NOT is_hidden;

-- Pending reports
SELECT COUNT(*) FROM reported_content 
WHERE status = 'pending';

-- Active bans
SELECT COUNT(*) FROM user_bans 
WHERE is_active = true;

-- Rate limit events (last hour)
SELECT action_type, COUNT(*) 
FROM rate_limit_events 
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY action_type;

-- Most active commenters
SELECT user_id, COUNT(*) as comment_count
FROM comments
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY user_id
ORDER BY comment_count DESC
LIMIT 10;
```

---

## ✅ Phase 4 Acceptance Criteria

### Comments:
- ✅ Create / read / hide / delete works
- ✅ Visibility respects moderation state
- ✅ Rate limiting prevents spam
- ✅ Guests can read, auth users can post

### Moderation:
- ✅ Report queue functions
- ✅ Admin actions take effect immediately
- ✅ Ban system prevents banned users from posting
- ✅ Audit trail maintained

### Anti-Abuse:
- ✅ Rate limits prevent spam
- ✅ No flood posting possible
- ✅ Duplicate detection works
- ✅ Server-side enforcement

### UX Integrity:
- ✅ Homepage unchanged
- ✅ Theater Mode remains dominant
- ✅ Community never interrupts playback
- ✅ No popups, no overlays on video
- ✅ Optional, user-controlled visibility

---

## 🎬 Cinema-First Compliance

### ✅ Compliant:
- Comments hidden by default
- Require explicit user action (button click)
- Don't interrupt playback
- Can be dismissed anytime
- Contained in bottom panel (max 50vh)
- No homepage changes
- No social feed
- No trending content
- No autoplay
- No notifications
- No gamification

### ❌ NOT Built (By Design):
- Direct messaging
- Friends/followers
- Social graphs
- Trending feeds
- Livestreams
- Infinite scroll
- Autoplay content
- Badges/streaks
- Popups/overlays

---

## 🚀 Future Enhancements (Out of Scope)

Possible additions for future phases:

- [ ] Comment threads (1 level deep as allowed)
- [ ] Pinned comments
- [ ] Comment sorting options
- [ ] User blocking (table exists, UI not built)
- [ ] Profanity filter
- [ ] Comment edit functionality
- [ ] Reaction analytics
- [ ] Creator post scheduling
- [ ] Image uploads (not just URLs)
- [ ] Comment search
- [ ] Export moderation logs

---

## ✅ Phase 4 Complete!

All community features have been implemented with strict adherence to the cinema-first philosophy. The platform remains a viewing experience first, with community features as an optional, non-intrusive addition.

**Key Achievement:** Added engagement without turning Warren Media into a social network.

