import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Title = {
  id: string
  title: string
  poster_url: string
  mux_playback_id: string
  category: 'trending' | 'originals' | 'new_releases'
  runtime_seconds: number
  created_at: string
}

export type PlaybackProgress = {
  id: string
  title_id: string
  position_seconds: number
  updated_at: string
  title?: Title
}

