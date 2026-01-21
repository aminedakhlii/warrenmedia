# Environment Variables Setup

Create a `.env.local` file in the root directory with the following variables:

## Required (Phase 1 & 2)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Optional (Phase 3 - Creator Uploads)

```bash
# Mux (Required for creator video uploads)
MUX_TOKEN_ID=your-mux-token-id
MUX_TOKEN_SECRET=your-mux-token-secret
```

## How to Get Mux Credentials

1. Sign up at [mux.com](https://mux.com)
2. Go to **Settings** → **Access Tokens**
3. Create a new token with permissions:
   - **Mux Video**: Full access
   - **Mux Data**: Read access (optional)
4. Copy the **Token ID** and **Token Secret**
5. Add them to your `.env.local` file
6. Restart your development server

**Note:** Without Mux credentials, creator uploads will show a setup message but the app will still work for admin uploads via direct Mux Playback IDs.

## Environment Variables by Feature

### Phase 1 & 2 (Core Platform)
- `NEXT_PUBLIC_SUPABASE_URL` - ✅ Required
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - ✅ Required

### Phase 3 (Creator Uploads)
- `MUX_TOKEN_ID` - ⚠️ Required only if enabling creator uploads
- `MUX_TOKEN_SECRET` - ⚠️ Required only if enabling creator uploads

### Phase 3 (Ads & Analytics)
- No additional environment variables needed
- Uses existing Supabase connection

## Security Notes

- Never commit `.env.local` to version control
- Keep your Mux tokens secure
- Rotate tokens if compromised
- Use different tokens for development and production

## Example .env.local File

```bash
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Mux (Optional - for creator uploads)
MUX_TOKEN_ID=your-token-id-here
MUX_TOKEN_SECRET=your-token-secret-here
```

## Troubleshooting

### "Mux is not configured" error
- Check that MUX_TOKEN_ID and MUX_TOKEN_SECRET are in `.env.local`
- Restart your development server after adding environment variables
- Verify tokens are correct and have proper permissions

### Supabase connection errors
- Verify URL and anon key are correct
- Check Supabase project is active
- Ensure RLS policies are properly configured

