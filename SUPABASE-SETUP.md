# Supabase Setup Guide

Quick guide for configuring Supabase for Warren Media Streaming.

## 📧 Email Authentication Settings

### Option 1: Disable Email Confirmation (Recommended for Development)

For easier testing and development, you can disable email confirmation:

1. Go to **Authentication** → **Providers** in Supabase
2. Click on **Email** provider
3. Scroll down to **Email Confirmation**
4. **Uncheck** "Confirm email"
5. Save changes

**Result**: Users can sign up and immediately start using the app without confirming their email.

### Option 2: Enable Email Confirmation (Recommended for Production)

For production, keep email confirmation enabled:

1. Go to **Authentication** → **Providers** in Supabase
2. Click on **Email** provider
3. Ensure "Confirm email" is **checked**
4. Customize email templates under **Authentication** → **Email Templates** (optional)
5. Configure your SMTP settings for custom email sender (optional)

**Result**: Users receive a confirmation email and must click the link before they can sign in.

**Important**: With email confirmation enabled:
- Users will see: "Account created! Please check your email to confirm your account."
- They won't be able to sign in until they click the confirmation link
- Check your spam folder if you don't receive the email

## 🔐 Email Provider Settings

1. Go to **Authentication** → **Providers**
2. Enable **Email** if not already enabled
3. Settings to configure:
   - **Confirm email**: On/Off (see above)
   - **Enable sign ups**: Keep ON (allows new registrations)
   - **Minimum password length**: 6 characters (default is fine)

## 🌐 Site URL Configuration

For production deployment:

1. Go to **Authentication** → **URL Configuration**
2. Set **Site URL** to your production domain: `https://your-domain.com`
3. Add **Redirect URLs**:
   - `https://your-domain.com`
   - `http://localhost:3000` (for local development)

## 📝 Email Templates (Optional)

Customize the emails sent to users:

1. Go to **Authentication** → **Email Templates**
2. Available templates:
   - **Confirm signup**: Sent when user creates account
   - **Magic Link**: For passwordless login (not used in Phase 2)
   - **Change Email Address**: When user changes their email
   - **Reset Password**: For password recovery

## 🧪 Testing Email Confirmation

### With Confirmation Disabled:
```
1. Create account → Immediately signed in
2. No email sent
3. Can start watching and saving progress right away
```

### With Confirmation Enabled:
```
1. Create account → See success message
2. Check email for confirmation link
3. Click link → Email confirmed
4. Return to site and sign in
5. Can now watch and save progress
```

## 🔒 Row Level Security (RLS)

The database schema sets up RLS automatically. Verify it's working:

1. Go to **Table Editor** → **playback_progress**
2. Click **RLS policies** tab
3. You should see:
   - Users can view own progress
   - Users can insert own progress
   - Users can update own progress
   - Users can delete own progress

## 🐛 Common Issues

### "Invalid login credentials"
- Check that email confirmation is disabled (for testing)
- Or verify the user clicked the confirmation link
- Check Authentication → Users to see user status

### "Failed to save progress"
- Verify user is signed in (not guest)
- Check RLS policies are enabled on playback_progress table
- Check browser console for specific errors

### Email not received
- Check spam/junk folder
- Verify Email provider is enabled
- Try with a different email service (Gmail, etc.)
- Check Supabase logs under **Logs** → **Auth Logs**

## 📊 Monitor Users

View registered users:

1. Go to **Authentication** → **Users**
2. See all registered users
3. Check if email is confirmed (green checkmark)
4. Manually confirm users or delete test accounts

## 🚀 Production Checklist

Before deploying to production:

- [ ] Enable email confirmation
- [ ] Set correct Site URL
- [ ] Add production domain to Redirect URLs
- [ ] Customize email templates with branding
- [ ] Configure custom SMTP (optional)
- [ ] Test signup flow end-to-end
- [ ] Test password reset flow
- [ ] Verify RLS policies are active

---

**Need more help?** Check [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)

