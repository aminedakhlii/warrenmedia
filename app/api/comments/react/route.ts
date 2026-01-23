import { NextRequest, NextResponse } from 'next/server'
import { supabase, getCurrentUser, isUserBanned, checkRateLimit, logRateLimit, type ReactionType } from '../../../lib/supabaseClient'

// Rate limit: 20 reactions per minute (lighter limit)
const REACTION_RATE_LIMIT = 20
const RATE_LIMIT_WINDOW_MINUTES = 1

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Check if user is banned
    const banned = await isUserBanned(user.id)
    if (banned) {
      return NextResponse.json({ error: 'You are banned from reacting' }, { status: 403 })
    }

    // Check rate limit
    const withinLimit = await checkRateLimit(user.id, 'reaction', REACTION_RATE_LIMIT, RATE_LIMIT_WINDOW_MINUTES)
    if (!withinLimit) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
    }

    const body = await request.json()
    const { commentId, reactionType } = body

    // Validation
    if (!commentId || !reactionType) {
      return NextResponse.json({ error: 'Comment ID and reaction type required' }, { status: 400 })
    }

    const validReactions: ReactionType[] = ['like', 'love', 'laugh']
    if (!validReactions.includes(reactionType)) {
      return NextResponse.json({ error: 'Invalid reaction type' }, { status: 400 })
    }

    // Check if reaction already exists
    const { data: existing } = await supabase
      .from('comment_reactions')
      .select('id, reaction_type')
      .eq('comment_id', commentId)
      .eq('user_id', user.id)
      .single()

    if (existing) {
      // If same reaction, remove it (toggle off)
      if (existing.reaction_type === reactionType) {
        const { error } = await supabase
          .from('comment_reactions')
          .delete()
          .eq('id', existing.id)

        if (error) throw error

        return NextResponse.json({ action: 'removed', reactionType })
      } else {
        // Different reaction, update it
        const { error } = await supabase
          .from('comment_reactions')
          .update({ reaction_type: reactionType })
          .eq('id', existing.id)

        if (error) throw error

        return NextResponse.json({ action: 'updated', reactionType })
      }
    } else {
      // Create new reaction
      const { error } = await supabase
        .from('comment_reactions')
        .insert({
          comment_id: commentId,
          user_id: user.id,
          reaction_type: reactionType,
        })

      if (error) throw error

      // Log rate limit event
      await logRateLimit(user.id, 'reaction')

      return NextResponse.json({ action: 'added', reactionType }, { status: 201 })
    }
  } catch (error) {
    console.error('Error handling reaction:', error)
    return NextResponse.json(
      { error: 'Failed to handle reaction', details: (error as Error).message },
      { status: 500 }
    )
  }
}

