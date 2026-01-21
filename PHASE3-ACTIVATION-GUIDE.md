# Phase 3 Activation Guide

## ✅ Phase 2 Accepted - Phase 3 Ready to Enable

Phase 2 has been formally accepted. Phase 3 features can now be safely activated.

## 🚀 Quick Activation Steps

### Step 1: Run Phase 3 Database Schema

In your **Supabase SQL Editor**, run the Phase 3 schema:

```sql
-- Copy and paste contents of supabase-schema-phase3.sql
```

This will create:
- Feature flags table (with all flags disabled)
- Creators table
- Ad configuration table
- Event tracking tables
- Mux uploads table

### Step 2: Verify Database Migration

Check that tables were created:

```sql
-- Verify feature flags
SELECT * FROM feature_flags;

-- Should show 3 flags, all disabled:
-- creator_uploads: false
-- ads_system: false
-- event_tracking: false
```

### Step 3: Enable Phase 3 Features

Go to **`/admin/settings`** and enable the features you want:

#### Option A: Enable All Features at Once
1. Go to `/admin/settings`
2. Click **ENABLED** on all three flags:
   - ✅ creator_uploads
   - ✅ ads_system
   - ✅ event_tracking

#### Option B: Enable Gradually
Start with tracking, then ads, then creators:

1. **First: Enable Event Tracking**
   - Enables analytics
   - No user-facing changes
   - Start collecting data

2. **Second: Enable Ads System**
   - Pre-roll ads become available
   - Must configure per-title in `/admin/ads`
   - Ads won't show until you enable them for specific titles

3. **Third: Enable Creator Uploads**
   - Creator portal becomes accessible at `/creator`
   - Users can apply to be creators
   - You review applications in `/admin/creators`

### Step 4: Configure Pre-Roll Ads (Optional)

If you enabled ads:

1. Go to **`/admin/ads`**
2. For each title you want to monetize:
   - Toggle **Ads: ON**
   - Set duration (15-30 seconds recommended)
   - Enter ad video URL
3. Ads will now play before those titles

### Step 5: Review Creator Applications

If you enabled creator uploads:

1. Users can apply at **`/creator`**
2. Review applications at **`/admin/creators`**
3. Approve or reject with notes
4. Approved creators can access upload portal

## 📊 Monitoring Phase 3

### Check Analytics

Visit **`/admin/analytics`** to see:
- Total play events
- Completion events
- Ad impressions
- Average watch percentage

### Monitor Creators

Visit **`/admin/creators`** to:
- See pending applications
- Track approved creators
- View rejection history

### Manage Ads

Visit **`/admin/ads`** to:
- Enable/disable ads per title
- Update ad configurations
- See titles with active ads

## 🎯 Recommended Activation Order

### For Maximum Safety:

**Week 1: Event Tracking Only**
```
✅ event_tracking: ON
❌ ads_system: OFF
❌ creator_uploads: OFF
```
- Collect baseline analytics
- No user-facing changes
- Monitor system performance

**Week 2: Add Pre-Roll Ads**
```
✅ event_tracking: ON
✅ ads_system: ON (configure for 1-2 titles only)
❌ creator_uploads: OFF
```
- Test ads on limited titles
- Monitor ad completion rates
- Get user feedback

**Week 3: Open Creator Applications**
```
✅ event_tracking: ON
✅ ads_system: ON
✅ creator_uploads: ON
```
- Accept first creator applications
- Test upload workflow
- Scale gradually

## 🧪 Testing Checklist

### Test Event Tracking

- [ ] Play a video
- [ ] Check `/admin/analytics` shows play event
- [ ] Close video partway through
- [ ] Verify completion event logged with percentage

### Test Pre-Roll Ads

- [ ] Enable ads for a test title
- [ ] Set ad URL and duration
- [ ] Play the title
- [ ] Verify ad plays before content
- [ ] Check ad impression logged in analytics
- [ ] Confirm clean transition to content

### Test Creator System

- [ ] As logged-in user, visit `/creator`
- [ ] Submit creator application
- [ ] As admin, review in `/admin/creators`
- [ ] Approve the application
- [ ] Verify creator sees upload portal
- [ ] Check creator status updates correctly

## 🎨 User Experience Verification

### Ads Should Be:
- ✅ Clean and minimal ("Ad · Xs" indicator only)
- ✅ Pre-roll only (before content)
- ✅ Smooth transition to content
- ✅ No homepage clutter
- ✅ No pop-ups or banners

### Theater Mode Should:
- ✅ Still feel premium
- ✅ Have same controls
- ✅ Preserve focus and scroll state
- ✅ Resume playback correctly

### Creator Portal Should:
- ✅ Only show when logged in
- ✅ Only show if flag enabled
- ✅ Show clear application status
- ✅ No revenue/analytics dashboards

## 🔒 Security Checklist

- [ ] RLS policies active on all new tables
- [ ] Creators can only see own applications
- [ ] Only admins can approve/reject creators
- [ ] Feature flags require admin access
- [ ] Event tracking doesn't collect PII

## 🐛 Troubleshooting

### Feature flag won't toggle
- Use Supabase dashboard SQL editor
- Update directly: `UPDATE feature_flags SET enabled = true WHERE feature_name = 'ads_system';`

### Ads not playing
- Check flag is enabled in `/admin/settings`
- Verify ad is enabled for that title in `/admin/ads`
- Confirm ad_url is valid
- Check browser console for errors

### Events not logging
- Verify `event_tracking` flag is enabled
- Check RLS policies
- Look for console errors during playback

### Creator portal not showing
- Confirm `creator_uploads` flag is enabled
- User must be logged in
- Check `/creator` URL directly

## 📈 Success Metrics

### Week 1 Targets (Tracking Only)
- Play events > 0
- Completion rate tracked
- No errors in logs

### Week 2 Targets (With Ads)
- Ad completion rate > 80%
- No increase in bounce rate
- User complaints < 5%

### Week 4 Targets (With Creators)
- 3-5 creator applications
- 1-2 creators approved
- First creator content uploaded

## 🔄 Rollback Plan

If issues arise, you can disable features instantly:

### Disable All Phase 3 (Emergency)
```sql
UPDATE feature_flags SET enabled = false;
```

### Disable Specific Features
```sql
-- Disable ads only
UPDATE feature_flags SET enabled = false WHERE feature_name = 'ads_system';

-- Disable creators only
UPDATE feature_flags SET enabled = false WHERE feature_name = 'creator_uploads';

-- Disable tracking only
UPDATE feature_flags SET enabled = false WHERE feature_name = 'event_tracking';
```

Changes take effect immediately - no restart needed.

## 📞 Support Resources

- **Database Schema**: `supabase-schema-phase3.sql`
- **Implementation Details**: `PHASE3-IMPLEMENTATION.md`
- **Phase 2 Migration**: `PHASE2-MIGRATION.md`
- **Admin Panels**: All under `/admin/*`

## ✅ Final Checklist

Before activating in production:

- [ ] Phase 3 schema run in Supabase
- [ ] All feature flags confirmed disabled initially
- [ ] Admin panels accessible
- [ ] Test ad video URL ready
- [ ] Rollback plan understood
- [ ] Monitoring in place

---

**Phase 3 is ready. Activate at your own pace. Start with event tracking, add ads gradually, then open to creators.**

