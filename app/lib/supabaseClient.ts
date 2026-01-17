import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type ContentType = 'film' | 'series' | 'music_video' | 'podcast'

export type Title = {
  id: string
  title: string
  poster_url: string
  mux_playback_id: string | null
  content_type: ContentType
  category: 'trending' | 'originals' | 'new_releases' | 'music_videos'
  runtime_seconds: number
  description?: string
  created_at: string
}

export type Season = {
  id: string
  series_id: string
  season_number: number
  title: string
  created_at: string
}

export type Episode = {
  id: string
  season_id: string
  episode_number: number
  title: string
  mux_playback_id: string
  runtime_seconds: number
  description?: string
  created_at: string
}

export type PlaybackProgress = {
  id: string
  user_id: string
  title_id: string | null
  episode_id: string | null
  position_seconds: number
  updated_at: string
  title?: Title
  episode?: Episode
}

// Auth helpers
export async function signUp(email: string, password: string) {
  return await supabase.auth.signUp({ email, password })
}

export async function signIn(email: string, password: string) {
  return await supabase.auth.signInWithPassword({ email, password })
}

export async function signOut() {
  return await supabase.auth.signOut()
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export function onAuthStateChange(callback: (user: any) => void) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(session?.user || null)
  })
}

