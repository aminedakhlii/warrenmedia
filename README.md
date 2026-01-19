no# Warren Media Streaming

A cinema-first streaming platform built with Next.js, featuring fullscreen theater mode playback, user authentication, and support for films, series, music videos, and podcasts.

## 🎬 Features

### Phase 2 (Current)
- **Authentication**: Email/password sign up and sign in with Supabase Auth
- **User-Specific Progress**: Resume playback tied to user accounts
- **Multiple Content Types**: Films, TV series with episodes, music videos, and podcasts
- **Series Support**: Seasons and episodes with in-theater episode selection
- **Audio Content**: Podcast playback with static artwork
- **Guest Browsing**: Watch content without signing in (no progress saved)

### Core Features
- **Theater Mode**: Fullscreen video/audio playback with custom controls
- **Smooth Scrolling**: Physics-based horizontal row scrolling with inertial glide
- **Resume Playback**: Automatic position saving (authenticated users only)
- **Continue Watching**: Smart tracking of viewing progress per user
- **Multi-Input Support**: Mouse drag, scroll wheel, touch, keyboard, and TV remote navigation
- **Mux Streaming**: HLS-based adaptive video streaming
- **Admin Panel**: Complete content management for all types

## 🛠️ Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Video**: Mux (HLS streaming)
- **Hosting**: Vercel (recommended)

## 📋 Prerequisites

- Node.js 18+ and npm
- Supabase account
- Mux account
- Git

## 🚀 Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/aminedakhlii/warrenmedia
cd warrenmedia
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Settings → API to find your project URL and anon key
3. **Enable Email Authentication**:
   - Go to Authentication → Providers
   - Enable Email provider
   - (Optional) For easier testing, disable "Confirm email" under Email Auth settings
4. In the SQL Editor, run the schema from `supabase-schema-phase2.sql`:

```sql
-- Copy and paste the contents of supabase-schema-phase2.sql
```

This will create:
- `titles` table: Stores all content (films, series, music videos, podcasts)
- `seasons` table: Seasons for series
- `episodes` table: Episodes for series seasons
- `playback_progress` table: User-specific progress tracking
- Indexes for performance
- RLS policies for authenticated users

**Note**: If migrating from Phase 1, see `PHASE2-MIGRATION.md`

### 4. Set Up Mux

1. Create an account at [mux.com](https://mux.com)
2. Upload videos and get Playback IDs
3. (Optional) Get API tokens if you plan to use server-side operations

### 5. Configure Environment Variables

Create a `.env.local` file in the root directory:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Optional: For server-side Mux operations
MUX_TOKEN_ID=your-mux-token-id
MUX_TOKEN_SECRET=your-mux-token-secret
```

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📱 Adding Content

### Via Admin Panel

Navigate to `/admin/titles`

#### Adding Films, Music Videos, or Podcasts

1. Select **Add Titles** tab
2. Choose **Content Type** (Film, Music Video, or Podcast)
3. Fill in:
   - **Title**: Display name
   - **Poster Image URL**: Direct link to poster image
   - **Mux Playback ID**: Get from your Mux dashboard
   - **Category**: Trending, Originals, New Releases, or Music Videos
   - **Runtime**: Duration in seconds
   - **Description**: Optional
4. Click "Add Title"

#### Adding Series with Episodes

1. First, add a Series title:
   - Select **Content Type**: Series
   - Fill in title, poster, category
   - Click "Add Title" (no Mux ID needed at title level)

2. Switch to **Manage Series** tab
3. Select your series from dropdown
4. Add seasons:
   - Season number (1, 2, 3...)
   - Season title ("Season 1")
5. For each season, click "Manage Episodes"
6. Add episodes:
   - Episode number
   - Episode title
   - Mux Playback ID (for the episode video)
   - Runtime and description

### Programmatically

```typescript
import { supabase } from './app/lib/supabaseClient'

// Add a film
await supabase.from('titles').insert({
  title: 'Movie Title',
  poster_url: 'https://...',
  mux_playback_id: 'abc123...',
  content_type: 'film',
  category: 'trending',
  runtime_seconds: 7200
})

// Add a series
const { data: series } = await supabase.from('titles').insert({
  title: 'Series Title',
  poster_url: 'https://...',
  content_type: 'series',
  category: 'originals'
}).select().single()

// Add season
const { data: season } = await supabase.from('seasons').insert({
  series_id: series.id,
  season_number: 1,
  title: 'Season 1'
}).select().single()

// Add episode
await supabase.from('episodes').insert({
  season_id: season.id,
  episode_number: 1,
  title: 'Pilot',
  mux_playback_id: 'episode_abc123...',
  runtime_seconds: 2400
})
```

## 🎮 Controls

### Theater Mode

- **Space / K**: Play/Pause
- **Escape**: Exit theater mode
- **Arrow Left**: Rewind 10 seconds
- **Arrow Right**: Fast forward 10 seconds
- **F**: Toggle fullscreen
- **Mouse Move**: Show controls
- **Click**: Play/Pause

### Homepage Browsing

- **Mouse Drag**: Scroll rows horizontally
- **Scroll Wheel**: Scroll rows
- **Arrow Keys**: Navigate between titles
- **Enter**: Play selected title
- **Touch**: Swipe to scroll

## 🏗️ Project Structure

```
warrenmedia/
├── app/
│   ├── components/
│   │   ├── RowSlider.tsx        # Horizontal scrolling row
│   │   └── TheaterOverlay.tsx   # Fullscreen video player
│   ├── lib/
│   │   └── supabaseClient.ts    # Database client & types
│   ├── admin/
│   │   └── titles/
│   │       └── page.tsx         # Admin interface
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Homepage
│   └── globals.css              # Global styles
├── supabase-schema.sql          # Database schema
├── next.config.js               # Next.js configuration
├── tailwind.config.ts           # Tailwind configuration
└── package.json                 # Dependencies
```

## 🎨 Design Philosophy

- **Dark & Architectural**: Minimal black background with warm amber accents
- **Cinema-First**: Theater mode is the core experience
- **Smooth Physics**: Analog feel for scrolling, no snapping
- **State Preservation**: Browsing state persists when returning from playback

## 📊 Database Schema

### `titles`
- `id`: UUID (primary key)
- `title`: Text
- `poster_url`: Text
- `mux_playback_id`: Text (nullable for series)
- `content_type`: Enum (film, series, music_video, podcast)
- `category`: Enum (trending, originals, new_releases, music_videos)
- `runtime_seconds`: Integer
- `description`: Text
- `created_at`: Timestamp

### `seasons`
- `id`: UUID (primary key)
- `series_id`: UUID (foreign key → titles)
- `season_number`: Integer
- `title`: Text
- `created_at`: Timestamp

### `episodes`
- `id`: UUID (primary key)
- `season_id`: UUID (foreign key → seasons)
- `episode_number`: Integer
- `title`: Text
- `mux_playback_id`: Text
- `runtime_seconds`: Integer
- `description`: Text
- `created_at`: Timestamp

### `playback_progress`
- `id`: UUID (primary key)
- `user_id`: UUID (foreign key → auth.users)
- `title_id`: UUID (foreign key → titles, nullable)
- `episode_id`: UUID (foreign key → episodes, nullable)
- `position_seconds`: Real
- `updated_at`: Timestamp
- Note: Either title_id OR episode_id is set, not both

## 🚀 Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy

```bash
npm run build  # Test build locally first
```

## 🔒 Security Notes

- **Authentication**: Email/password via Supabase Auth
- **RLS Policies**: Playback progress restricted to authenticated users only
- **Public Content**: All titles/episodes are publicly viewable
- **Guest Users**: Can browse and watch, but progress is not saved
- **Admin Panel**: No password protection (consider adding in future)

## 🐛 Troubleshooting

### Authentication Issues

**Can't sign up/sign in**
- Verify Email provider is enabled in Supabase (Authentication → Providers)
- Check browser console for errors
- Ensure NEXT_PUBLIC_SUPABASE_URL and ANON_KEY are correct

**Progress not saving**
- Confirm you're logged in (check header for your email)
- Guest users cannot save progress (this is expected)
- Check RLS policies in Supabase

### Playback Issues

**Videos won't play**
- Verify Mux Playback ID is correct
- Check browser console for errors
- Ensure Mux video is ready (not still processing)

**Episodes not loading**
- Verify seasons are created first
- Check that each episode has a valid mux_playback_id
- Check browser console for SQL errors

**Podcasts not playing**
- Ensure content_type is set to 'podcast'
- Verify Mux playback ID is valid for audio
- Check audio element in browser dev tools

### Continue Watching

**Continue Watching not appearing**
- Only appears for logged-in users
- Must have progress > 2 seconds saved
- Check that playback_progress has user_id set

**Guest user seeing Continue Watching**
- This shouldn't happen - clear browser localStorage
- Check auth state in Header component

### UI Issues

**Scrolling feels jerky**
- Try reducing the number of titles in a row
- Check if images are optimized
- Verify smooth scrolling CSS is applied

**Episode selector not showing**
- Verify content_type is 'series'
- Check that seasons and episodes exist
- Look for console errors when clicking "Episodes"

## 📝 Implementation Status

### Phase 2 (Current) ✅
✅ User authentication (email/password)  
✅ User-specific playback progress  
✅ Guest browsing (no progress saving)  
✅ Multiple content types (film, series, music video, podcast)  
✅ Series with seasons and episodes  
✅ In-theater episode selection  
✅ Audio playback for podcasts  
✅ Enhanced admin panel  

### Phase 1 ✅
✅ Cinema-first theater mode  
✅ Smooth horizontal scrolling with physics  
✅ Resume playback functionality  
✅ Continue Watching row  
✅ Category-based content rows  
✅ Keyboard/TV navigation  
✅ Basic admin panel  

### Not Implemented (Out of Scope)
❌ Playlists  
❌ Social features (likes, comments)  
❌ Creator uploads  
❌ User profiles/avatars  
❌ Payment/subscription system  
❌ Ads  

## 🤝 Contributing

This is Phase 1. Follow the specifications in `prompt.txt` strictly.

## 📄 License

[Your License Here]

---

Built with ❤️ for cinema lovers

