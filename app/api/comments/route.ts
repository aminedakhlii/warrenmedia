import { NextRequest, NextResponse } from 'next/server'
import { supabase, getCurrentUser, isUserBanned, checkRateLimit, logRateLimit } from '../../lib/supabaseClient'

// Rate limit: 5 comments per minute
const COMMENT_RATE_LIMIT = 5
const RATE_LIMIT_WINDOW_MINUTES = 1

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const titleId = searchParams.get('titleId')
    const episodeId = searchParams.get('episodeId')
    const userId = searchParams.get('userId')

    if (!titleId) {
      return NextResponse.json({ error: 'Title ID required' }, { status: 400 })
    }

    // Build query
    let query = supabase
      .from('comments')
      .select('*')
      .eq('title_id', titleId)
      .eq('is_deleted', false)
      .eq('is_hidden', false)
      .order('created_at', { ascending: false })

    // Filter by episode if provided
    if (episodeId) {
      query = query.eq('episode_id', episodeId)
    } else {
      query = query.is('episode_id', null)
    }

    // Get comments
    const { data: comments, error } = await query

    if (error) throw error

    // Get reaction counts for each comment
    const commentIds = comments?.map(c => c.id) || []
    
    let reactionsData: any[] = []
    if (commentIds.length > 0) {
      const { data } = await supabase
        .from('comment_reactions')
        .select('comment_id, reaction_type')
        .in('comment_id', commentIds)
      
      reactionsData = data || []
    }

    // Get user's reactions if authenticated
    let userReactions: any[] = []
    if (userId) {
      const { data } = await supabase
        .from('comment_reactions')
        .select('comment_id, reaction_type')
        .in('comment_id', commentIds)
        .eq('user_id', userId)
      
      userReactions = data || []
    }

    // Get user profiles for display names
    const userIds = comments?.map(c => c.user_id) || []
    let userProfiles: any = {}
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('user_id, display_name')
        .in('user_id', userIds)
      
      if (profiles) {
        profiles.forEach(p => {
          userProfiles[p.user_id] = p.display_name
        })
      }
    }

    // Aggregate reaction counts
    const commentsWithReactions = comments?.map(comment => {
      const commentReactions = reactionsData.filter(r => r.comment_id === comment.id)
      const userReaction = userReactions.find(r => r.comment_id === comment.id)
      
      // Use display name if exists, otherwise fallback to truncated user ID
      const displayName = userProfiles[comment.user_id] || `User ${comment.user_id.slice(0, 8)}`
      
      return {
        ...comment,
        like_count: commentReactions.filter(r => r.reaction_type === 'like').length,
        love_count: commentReactions.filter(r => r.reaction_type === 'love').length,
        laugh_count: commentReactions.filter(r => r.reaction_type === 'laugh').length,
        total_reactions: commentReactions.length,
        user_reaction: userReaction?.reaction_type || null,
        user_email: displayName,
      }
    })

    return NextResponse.json({ comments: commentsWithReactions || [] })
  } catch (error) {
    console.error('Error fetching comments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch comments', details: (error as Error).message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get auth token from request header
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Create authenticated supabase client
    const { createClient } = await import('@supabase/supabase-js')
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    })

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Check if user is banned
    const banned = await isUserBanned(user.id)
    if (banned) {
      return NextResponse.json({ error: 'You are banned from posting comments' }, { status: 403 })
    }

    // Check rate limit
    const withinLimit = await checkRateLimit(user.id, 'comment', COMMENT_RATE_LIMIT, RATE_LIMIT_WINDOW_MINUTES)
    if (!withinLimit) {
      return NextResponse.json({ error: 'Rate limit exceeded. Please wait before posting again.' }, { status: 429 })
    }

    const body = await request.json()
    const { titleId, episodeId, content, parentCommentId } = body

    // Validation
    if (!titleId || !content) {
      return NextResponse.json({ error: 'Title ID and content required' }, { status: 400 })
    }

    if (content.length > 1000) {
      return NextResponse.json({ error: 'Comment too long (max 1000 characters)' }, { status: 400 })
    }

    // Check for duplicate content (anti-spam) using authenticated client
    const recentWindow = new Date(Date.now() - 60 * 1000).toISOString() // Last minute
    const { data: recentComments } = await supabaseAuth
      .from('comments')
      .select('content')
      .eq('user_id', user.id)
      .gte('created_at', recentWindow)
    
    if (recentComments?.some(c => c.content === content)) {
      return NextResponse.json({ error: 'Duplicate comment detected' }, { status: 400 })
    }

    // Create comment using authenticated client (for RLS)
    const { data: comment, error } = await supabaseAuth
      .from('comments')
      .insert({
        user_id: user.id,
        title_id: titleId,
        episode_id: episodeId || null,
        content: content.trim(),
        parent_comment_id: parentCommentId || null,
      })
      .select()
      .single()

    if (error) throw error

    // Log rate limit event using authenticated client
    await supabaseAuth.from('rate_limit_events').insert({
      user_id: user.id,
      action_type: 'comment',
    })

    return NextResponse.json({ comment }, { status: 201 })
  } catch (error) {
    console.error('Error creating comment:', error)
    return NextResponse.json(
      { error: 'Failed to create comment', details: (error as Error).message },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Get auth token from request header
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Create authenticated supabase client
    const { createClient } = await import('@supabase/supabase-js')
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    })

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const commentId = searchParams.get('id')

    if (!commentId) {
      return NextResponse.json({ error: 'Comment ID required' }, { status: 400 })
    }

    // Verify ownership using authenticated client
    const { data: comment } = await supabaseAuth
      .from('comments')
      .select('user_id')
      .eq('id', commentId)
      .single()

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    if (comment.user_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized to delete this comment' }, { status: 403 })
    }

    // Soft delete using authenticated client
    const { error } = await supabaseAuth
      .from('comments')
      .update({ is_deleted: true })
      .eq('id', commentId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting comment:', error)
    return NextResponse.json(
      { error: 'Failed to delete comment', details: (error as Error).message },
      { status: 500 }
    )
  }
}

