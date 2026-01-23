import { NextRequest, NextResponse } from 'next/server'
import { supabase, getCurrentUser, getFeatureFlag, checkRateLimit, logRateLimit } from '../../lib/supabaseClient'

// Rate limit: 3 posts per hour
const POST_RATE_LIMIT = 3
const RATE_LIMIT_WINDOW_MINUTES = 60

export async function GET(request: NextRequest) {
  try {
    // Check feature flag
    const enabled = await getFeatureFlag('enable_creator_posts')
    if (!enabled) {
      return NextResponse.json({ posts: [] })
    }

    const { searchParams } = new URL(request.url)
    const creatorId = searchParams.get('creatorId')
    const titleId = searchParams.get('titleId')

    let query = supabase
      .from('creator_posts')
      .select('*')
      .eq('is_hidden', false)
      .order('created_at', { ascending: false })
      .limit(20)

    if (creatorId) {
      query = query.eq('creator_id', creatorId)
    }

    if (titleId) {
      query = query.eq('title_id', titleId)
    }

    const { data: posts, error } = await query

    if (error) throw error

    return NextResponse.json({ posts: posts || [] })
  } catch (error) {
    console.error('Error fetching creator posts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch creator posts', details: (error as Error).message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check feature flag
    const enabled = await getFeatureFlag('enable_creator_posts')
    if (!enabled) {
      return NextResponse.json({ error: 'Creator posts feature is disabled' }, { status: 403 })
    }

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

    // Check if user is a creator using authenticated client
    const { data: creator } = await supabaseAuth
      .from('creators')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'approved')
      .single()

    if (!creator) {
      return NextResponse.json({ error: 'Only approved creators can post' }, { status: 403 })
    }

    // Check rate limit
    const withinLimit = await checkRateLimit(user.id, 'creator_post', POST_RATE_LIMIT, RATE_LIMIT_WINDOW_MINUTES)
    if (!withinLimit) {
      return NextResponse.json({ error: 'Post limit exceeded. Please wait before posting again.' }, { status: 429 })
    }

    const body = await request.json()
    const { content, imageUrl, titleId } = body

    // Validation
    if (!content) {
      return NextResponse.json({ error: 'Content required' }, { status: 400 })
    }

    if (content.length > 2000) {
      return NextResponse.json({ error: 'Content too long (max 2000 characters)' }, { status: 400 })
    }

    // Create post using authenticated client
    const { data: post, error } = await supabaseAuth
      .from('creator_posts')
      .insert({
        creator_id: creator.id,
        title_id: titleId || null,
        content: content.trim(),
        image_url: imageUrl || null,
      })
      .select()
      .single()

    if (error) throw error

    // Log rate limit event using authenticated client
    await supabaseAuth.from('rate_limit_events').insert({
      user_id: user.id,
      action_type: 'creator_post',
    })

    return NextResponse.json({ post }, { status: 201 })
  } catch (error) {
    console.error('Error creating creator post:', error)
    return NextResponse.json(
      { error: 'Failed to create creator post', details: (error as Error).message },
      { status: 500 }
    )
  }
}

