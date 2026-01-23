import { NextRequest, NextResponse } from 'next/server'
import { supabase, getCurrentUser, checkRateLimit, logRateLimit } from '../../lib/supabaseClient'

// Rate limit: 10 reports per hour
const REPORT_RATE_LIMIT = 10
const RATE_LIMIT_WINDOW_MINUTES = 60

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

    // Check rate limit
    const withinLimit = await checkRateLimit(user.id, 'report', REPORT_RATE_LIMIT, RATE_LIMIT_WINDOW_MINUTES)
    if (!withinLimit) {
      return NextResponse.json({ error: 'Report limit exceeded. Please wait before reporting again.' }, { status: 429 })
    }

    const body = await request.json()
    const { contentType, contentId, reason } = body

    // Validation
    if (!contentType || !contentId || !reason) {
      return NextResponse.json({ error: 'Content type, ID, and reason required' }, { status: 400 })
    }

    const validContentTypes = ['comment', 'creator_post', 'user']
    if (!validContentTypes.includes(contentType)) {
      return NextResponse.json({ error: 'Invalid content type' }, { status: 400 })
    }

    if (reason.length > 500) {
      return NextResponse.json({ error: 'Reason too long (max 500 characters)' }, { status: 400 })
    }

    // Check if already reported by this user
    const { data: existing } = await supabase
      .from('reported_content')
      .select('id')
      .eq('content_type', contentType)
      .eq('content_id', contentId)
      .eq('reported_by', user.id)
      .eq('status', 'pending')
      .single()

    if (existing) {
      return NextResponse.json({ error: 'You have already reported this content' }, { status: 400 })
    }

    // Create report
    const { data: report, error } = await supabase
      .from('reported_content')
      .insert({
        content_type: contentType,
        content_id: contentId,
        reported_by: user.id,
        reason: reason.trim(),
        status: 'pending',
      })
      .select()
      .single()

    if (error) throw error

    // Log rate limit event
    await logRateLimit(user.id, 'report')

    return NextResponse.json({ report }, { status: 201 })
  } catch (error) {
    console.error('Error creating report:', error)
    return NextResponse.json(
      { error: 'Failed to create report', details: (error as Error).message },
      { status: 500 }
    )
  }
}

