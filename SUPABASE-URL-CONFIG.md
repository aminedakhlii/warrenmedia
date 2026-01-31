# Fix Email Verification Localhost URL

## Problem

When users sign up, they receive an email verification link that goes to `localhost:3000` instead of your production domain.

## Solution

Configure the Site URL in Supabase Dashboard.

---

## Steps to Fix

### 1. Go to Supabase Dashboard

1. Open your Supabase project
2. Navigate to **Authentication** → **URL Configuration**

### 2. Set Site URL

**For Development:**
```
http://localhost:3000
```

**For Production:**
```
https://your-domain.com
```

**For Both (Recommended):**
Set Site URL to your production domain, and add localhost to Redirect URLs:

- **Site URL:** `https://your-domain.com`
- **Redirect URLs:** 
  - `https://your-domain.com/**`
  - `http://localhost:3000/**`

### 3. Configure Redirect URLs

Add all URLs where users might complete authentication:

```
https://your-domain.com/**
https://your-domain.com/auth/callback
http://localhost:3000/**
http://localhost:3000/auth/callback
```

### 4. Update Email Templates (Optional)

Go to **Authentication** → **Email Templates** → **Confirm signup**

Change the confirmation link from:
```
{{ .ConfirmationURL }}
```

To use your production domain:
```
https://your-domain.com/auth/confirm?token={{ .Token }}
```

---

## For Development Only

If you're only testing locally and don't have a production domain yet:

1. Set **Site URL** to: `http://localhost:3000`
2. Add redirect URL: `http://localhost:3000/**`
3. **OR** Disable email confirmation (see below)

---

## Disable Email Confirmation (Testing Only)

To skip email verification during development:

1. Go to **Authentication** → **Providers**
2. Click **Email**
3. **Uncheck** "Confirm email"
4. Save

**Result:** Users can sign up and immediately access the platform without email verification.

**⚠️ Remember to re-enable this for production!**

---

## Verify Configuration

After updating:

1. **Sign up** with a new test account
2. Check the **email** you receive
3. The link should now point to your configured Site URL
4. Click the link and verify it works

---

## Production Deployment Checklist

Before deploying to production:

- [ ] Set Site URL to production domain
- [ ] Add production domain to Redirect URLs
- [ ] Keep `http://localhost:3000/**` for local development
- [ ] Enable email confirmation
- [ ] Test signup flow end-to-end
- [ ] Verify email links work

---

## Common Issues

### Links still go to localhost

**Solution:**
- Make sure you saved the configuration
- Wait 1-2 minutes for changes to propagate
- Try signing up with a new email (not one used before)

### Email confirmation not working

**Solution:**
- Check spam/junk folder
- Verify Email provider is enabled
- Check redirect URLs include your domain
- Look at Supabase logs (Logs → Auth Logs)

### Users stuck at "Verify Your Email"

**Solution:**
- If testing locally, disable email confirmation
- Or set Site URL to localhost for development
- Or manually confirm users in Supabase dashboard

---

## Manual User Confirmation (Admin)

If needed, you can manually confirm users:

1. Go to **Authentication** → **Users**
2. Find the user
3. Click on the user
4. Click **Confirm email**

---

**Status:** Configuration required in Supabase Dashboard  
**Time:** 2 minutes  
**Difficulty:** Easy
