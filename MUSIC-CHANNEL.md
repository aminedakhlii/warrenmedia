# Music Channel

Dedicated 24/7 music video channel at **/music**.

## Setup

1. **Run the SQL schema** (once) in Supabase SQL Editor:
   - Open `supabase-music-channel.sql`
   - Run the full script to create `music_channel_settings` and `music_channel_playlist`

2. **Configure the channel** (Admin):
   - Go to **Admin → Titles**, then open **Music Channel** (or go to `/admin/music`)
   - Toggle **Live** on/off
   - Optionally set **Pre-roll ad** (Mux playback ID or URL + duration) so an ad plays before the first video
   - **Add** music videos to the playlist (only titles with content type **Music Video** appear)
   - **Reorder** with ↑/↓ and **Remove** as needed

3. **Content**:
   - Add titles with **Content type: Music Video** (and category e.g. **Music Videos**) in Manage Titles
   - Then add them to the Music Channel playlist in Admin → Music Channel

## Behavior

- **URL:** `/music`
- **Layout:** Minimal header (“Warren Media Music” + “Live • 24/7”), full-width player, then “Recently Played” and “Submit Your Video” CTA
- **Playback:** First video auto-plays (subject to browser autoplay). Pre-roll ad plays before first video if configured and ads feature flag is on
- **Playlist:** Plays in order; **Skip** goes to next; at the end, playlist **loops** (if enabled in settings)
- **Now Playing:** Overlay at bottom-left, auto-fades after a few seconds
- **No** mid-roll or banner ads on this page

## Navigation

- **Main site:** Header includes a “Music” link to `/music`
- **Admin:** “Music Channel” under Phase 3 admin tools (from Manage Titles) and at `/admin/music`

## Future-proofing (not built)

Structure is ready for:

- Genre-based channels
- Sponsored music blocks
- Artist spotlight rotation
- Creator analytics

These are not implemented; add when needed.
