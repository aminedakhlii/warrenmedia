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

// Phase 3 Types

export type CreatorStatus = 'pending' | 'approved' | 'rejected'

export type Creator = {
  id: string
  user_id: string
  name: string
  email: string
  bio?: string
  status: CreatorStatus
  application_notes?: string
  admin_notes?: string
  rejection_reason?: string
  reviewed_by?: string
  reviewed_at?: string
  created_at: string
  updated_at: string
}

export type TitleAdConfig = {
  id: string
  title_id: string
  ads_enabled: boolean
  ad_duration_seconds: number
  ad_url?: string
  created_at: string
  updated_at: string
}

export type PlayEvent = {
  id: string
  user_id?: string
  title_id?: string
  episode_id?: string
  session_id?: string
  created_at: string
}

export type CompletionEvent = {
  id: string
  user_id?: string
  title_id?: string
  episode_id?: string
  session_id?: string
  watch_percentage: number
  created_at: string
}

export type AdImpressionEvent = {
  id: string
  user_id?: string
  title_id?: string
  episode_id?: string
  session_id?: string
  ad_duration_seconds: number
  completed: boolean
  created_at: string
}

export type MuxUpload = {
  id: string
  creator_id: string
  mux_upload_id: string
  mux_asset_id?: string
  mux_playback_id?: string
  status: 'preparing' | 'asset_created' | 'ready' | 'errored'
  title_metadata?: any
  created_at: string
  updated_at: string
}

export type FeatureFlag = {
  id: string
  feature_name: string
  enabled: boolean
  description?: string
  updated_at: string
}

// Music Channel
export type MusicChannelSettings = {
  id: string
  is_live: boolean
  loop_enabled: boolean
  ad_playback_id: string | null
  ad_duration_seconds: number
  updated_at: string
}

export type MusicChannelPlaylistItem = {
  id: string
  title_id: string
  position: number
  is_active: boolean
  created_at: string
  title?: Title
}

export async function getMusicChannelSettings(): Promise<MusicChannelSettings | null> {
  try {
    const { data } = await supabase
      .from('music_channel_settings')
      .select('*')
      .limit(1)
      .maybeSingle()
    return data as MusicChannelSettings | null
  } catch {
    return null
  }
}

export async function getMusicChannelPlaylist(): Promise<(MusicChannelPlaylistItem & { title: Title })[]> {
  try {
    const { data } = await supabase
      .from('music_channel_playlist')
      .select(`
        *,
        title:titles(*)
      `)
      .eq('is_active', true)
      .order('position', { ascending: true })
    return (data || []) as (MusicChannelPlaylistItem & { title: Title })[]
  } catch {
    return []
  }
}

// Curated playlists (/watch/playlists/[slug])
export type PlaylistType = 'movies' | 'music_videos'

export type Playlist = {
  id: string
  name: string
  slug: string
  playlist_type: PlaylistType
  is_active: boolean
  created_at: string
}

export type PlaylistItem = {
  id: string
  playlist_id: string
  title_id: string
  sort_order: number
  created_at: string
}

/** Titles eligible for playlist admin picker (must have Mux playback). */
export async function getTitlesForPlaylistPicker(
  playlistType: PlaylistType
): Promise<Title[]> {
  const contentType = playlistType === 'movies' ? 'film' : 'music_video'
  const { data, error } = await supabase
    .from('titles')
    .select('*')
    .eq('content_type', contentType)
    .not('mux_playback_id', 'is', null)
    .order('title', { ascending: true })

  if (error) {
    console.error('getTitlesForPlaylistPicker:', error)
    return []
  }
  return (data || []) as Title[]
}

export async function getActivePlaylists(): Promise<Playlist[]> {
  const { data, error } = await supabase
    .from('playlists')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (error) {
    console.error('getActivePlaylists:', error)
    return []
  }
  return (data || []) as Playlist[]
}

export async function getPlaylistBySlug(slug: string): Promise<Playlist | null> {
  const { data, error } = await supabase
    .from('playlists')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle()

  if (error) {
    console.error('getPlaylistBySlug:', error)
    return null
  }
  return data as Playlist | null
}

/** Ordered items with titles; caller should filter to titles with mux_playback_id for playback. */
export async function getPlaylistItemsWithTitles(
  playlistId: string
): Promise<{ sort_order: number; title: Title }[]> {
  const { data: rows, error } = await supabase
    .from('playlist_items')
    .select('sort_order, title_id')
    .eq('playlist_id', playlistId)
    .order('sort_order', { ascending: true })

  if (error || !rows?.length) {
    if (error) console.error('getPlaylistItemsWithTitles:', error)
    return []
  }

  const titleIds = [...new Set(rows.map((r) => r.title_id as string))]
  const { data: titles, error: tErr } = await supabase
    .from('titles')
    .select('*')
    .in('id', titleIds)

  if (tErr || !titles) {
    console.error('getPlaylistItemsWithTitles titles:', tErr)
    return []
  }

  const byId = new Map((titles as Title[]).map((t) => [t.id, t]))
  return rows
    .map((r) => ({
      sort_order: r.sort_order as number,
      title: byId.get(r.title_id as string),
    }))
    .filter((x): x is { sort_order: number; title: Title } => !!x.title)
}

export function slugifyPlaylistSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'playlist'
}

// Feature Flag helpers
export async function getFeatureFlag(featureName: string): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('feature_flags')
      .select('enabled')
      .eq('feature_name', featureName)
      .single()
    
    return data?.enabled || false
  } catch {
    return false
  }
}

export async function getAllFeatureFlags(): Promise<FeatureFlag[]> {
  const { data } = await supabase
    .from('feature_flags')
    .select('*')
    .order('feature_name')
  
  return data || []
}

// Event tracking helpers
export async function logPlayEvent(
  titleId?: string,
  episodeId?: string,
  sessionId?: string
) {
  const user = await getCurrentUser()
  
  return await supabase.from('play_events').insert({
    user_id: user?.id,
    title_id: titleId,
    episode_id: episodeId,
    session_id: sessionId,
  })
}

export async function logCompletionEvent(
  watchPercentage: number,
  titleId?: string,
  episodeId?: string,
  sessionId?: string
) {
  const user = await getCurrentUser()
  
  return await supabase.from('completion_events').insert({
    user_id: user?.id,
    title_id: titleId,
    episode_id: episodeId,
    session_id: sessionId,
    watch_percentage: watchPercentage,
  })
}

export async function logAdImpressionEvent(
  adDurationSeconds: number,
  completed: boolean,
  titleId?: string,
  episodeId?: string,
  sessionId?: string
) {
  const user = await getCurrentUser()
  
  return await supabase.from('ad_impression_events').insert({
    user_id: user?.id,
    title_id: titleId,
    episode_id: episodeId,
    session_id: sessionId,
    ad_duration_seconds: adDurationSeconds,
    completed: completed,
  })
}

// Phase 4 Types - Community (Cinema-First, Non-Noisy)

export type ReactionType = 'like' | 'love' | 'laugh'

export type Comment = {
  id: string
  user_id: string
  title_id: string
  episode_id?: string
  parent_comment_id?: string
  content: string
  is_hidden: boolean
  is_deleted: boolean
  hidden_by?: string
  hidden_at?: string
  hidden_reason?: string
  created_at: string
  updated_at: string
}

export type CommentWithDetails = Comment & {
  like_count: number
  love_count: number
  laugh_count: number
  total_reactions: number
  user_email?: string
}

export type CommentReaction = {
  id: string
  comment_id: string
  user_id: string
  reaction_type: ReactionType
  created_at: string
}

export type CreatorPost = {
  id: string
  creator_id: string
  title_id?: string
  content: string
  image_url?: string
  is_hidden: boolean
  hidden_by?: string
  hidden_at?: string
  hidden_reason?: string
  created_at: string
  updated_at: string
}

export type ReportedContent = {
  id: string
  content_type: 'comment' | 'creator_post' | 'user'
  content_id: string
  reported_by: string
  reason: string
  status: 'pending' | 'reviewed' | 'actioned' | 'dismissed'
  reviewed_by?: string
  reviewed_at?: string
  admin_notes?: string
  created_at: string
}

export type UserBan = {
  id: string
  user_id: string
  banned_by: string
  reason: string
  ban_type: 'comment' | 'full'
  expires_at?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export type BlockedUser = {
  id: string
  user_id: string
  blocked_user_id: string
  created_at: string
}

// User Profile Type
export type UserProfile = {
  id: string
  user_id: string
  display_name: string
  created_at: string
  updated_at: string
}

// Phase 4 Helper Functions

// Check if user is banned from commenting
export async function isUserBanned(userId?: string): Promise<boolean> {
  if (!userId) return false
  
  const { data } = await supabase
    .from('user_bans')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .or('expires_at.is.null,expires_at.gt.now()')
    .limit(1)
  
  return (data && data.length > 0) || false
}

// Check rate limit for user action
export async function checkRateLimit(
  userId: string,
  actionType: string,
  limit: number,
  windowMinutes: number
): Promise<boolean> {
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString()
  
  const { count } = await supabase
    .from('rate_limit_events')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('action_type', actionType)
    .gte('created_at', windowStart)
  
  return (count || 0) < limit
}

// Log rate limit event
export async function logRateLimit(userId: string, actionType: string) {
  return await supabase.from('rate_limit_events').insert({
    user_id: userId,
    action_type: actionType,
  })
}

