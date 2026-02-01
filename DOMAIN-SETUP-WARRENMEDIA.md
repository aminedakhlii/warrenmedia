# Fix Email Links to Use warrenmedia.channel

## Problem

Email verification links are going to `localhost:3000` instead of your production domain `https://warrenmedia.channel`

---

## Solution: Configure Supabase Site URL

### Step 1: Go to Supabase Dashboard

1. Open your Supabase project
2. Navigate to **Authentication** → **URL Configuration**

### Step 2: Update Site URL

**Set the following:**

**Site URL:**
```
https://warrenmedia.channel
```

**Redirect URLs:** (Add all these)
```
https://warrenmedia.channel/**
https://warrenmedia.channel/auth/callback
http://localhost:3000/**
http://localhost:3000/auth/callback
```

**Why both?**
- Production URL for live users
- Localhost for your local development

### Step 3: Save Changes

Click **Save** and wait 1-2 minutes for changes to propagate.

---

## Step 4: Test

1. Sign up with a new test email
2. Check the email you receive
3. The link should now point to: `https://warrenmedia.channel/...`
4. Click the link to verify it works

---

## Additional Configuration (Optional but Recommended)

### Custom Email Templates

Go to **Authentication** → **Email Templates** → **Confirm signup**

Update the confirmation link to explicitly use your domain:

**Before:**
```
{{ .ConfirmationURL }}
```

**After:**
```
https://warrenmedia.channel/auth/confirm?token={{ .Token }}&type=signup
```

This ensures even if Site URL isn't set correctly, emails will still work.

---

## Troubleshooting

### Links Still Go to Localhost

**Solution:**
1. Clear Supabase cache: Wait 5 minutes after saving
2. Try with a **brand new email** (not one you've used before)
3. Check if you saved the configuration correctly
4. Hard refresh your browser (Ctrl+Shift+R or Cmd+Shift+R)

### Email Not Arriving

**Solution:**
1. **Check spam/junk folder** (most common issue)
2. Verify email provider is configured in Supabase
3. Check Supabase logs: **Logs** → **Auth Logs**
4. Try a different email address

### Link Goes to Wrong Domain

**Solution:**
1. Double-check Site URL is exactly: `https://warrenmedia.channel`
2. No trailing slash
3. Must include `https://`
4. Check for typos

---

## Verification Checklist

After configuration:

- [ ] Site URL set to `https://warrenmedia.channel`
- [ ] Redirect URLs include both production and localhost
- [ ] Configuration saved
- [ ] Waited 2 minutes for propagation
- [ ] Tested with new email address
- [ ] Checked spam folder
- [ ] Link points to correct domain
- [ ] Link successfully activates account

---

## Important Notes

1. **Don't remove localhost URLs** - You need them for local development
2. **Use HTTPS** - Always use `https://` for production URL
3. **No trailing slash** - URL should not end with `/`
4. **Case sensitive** - Use exact domain spelling
5. **Propagation time** - Changes may take 1-2 minutes to apply

---

## Current Configuration Should Be:

```
Site URL: https://warrenmedia.channel

Redirect URLs:
  - https://warrenmedia.channel/**
  - https://warrenmedia.channel/auth/callback
  - http://localhost:3000/**
  - http://localhost:3000/auth/callback
```

---

## After Setup

Once configured, all new sign-ups will receive emails with links to `warrenmedia.channel` instead of localhost.

**Status:** Configuration Required in Supabase Dashboard  
**Time:** 5 minutes  
**Difficulty:** Easy
