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

