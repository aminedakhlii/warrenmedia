import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../lib/supabaseClient'

// Phase 5: Rate limiting for uploads
const UPLOAD_RATE_LIMIT = 10 // Max 10 uploads
const RATE_LIMIT_WINDOW_MINUTES = 60 // Per hour

async function checkUploadRateLimit(userId: string): Promise<boolean> {
  try {
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000)

    const { data: attempts } = await supabase
      .from('rate_limit_events')
      .select('id')
      .eq('user_id', userId)
      .eq('action_type', 'upload')
      .gte('created_at', windowStart.toISOString())

    return (attempts?.length || 0) < UPLOAD_RATE_LIMIT
  } catch (error) {
    console.error('Error checking upload rate limit:', error)
    return true // Allow on error
  }
}

async function logUploadAttempt(userId: string): Promise<void> {
  try {
    await supabase.from('rate_limit_events').insert({
      user_id: userId,
      action_type: 'upload',
    })
  } catch (error) {
    console.error('Error logging upload attempt:', error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { creatorId, metadata } = await request.json()

    // Phase 5: Check rate limit
    if (creatorId) {
      const withinLimit = await checkUploadRateLimit(creatorId)
      if (!withinLimit) {
        return NextResponse.json(
          { 
            error: 'Upload limit exceeded',
            message: `Too many uploads. Please try again in ${RATE_LIMIT_WINDOW_MINUTES} minutes.`
          },
          { status: 429 }
        )
      }
    }

    // For now, return a simulated response until Mux tokens are configured
    // In production, this would call Mux API to create a direct upload URL
    
    const MUX_TOKEN_ID = process.env.MUX_TOKEN_ID
    const MUX_TOKEN_SECRET = process.env.MUX_TOKEN_SECRET

    if (!MUX_TOKEN_ID || !MUX_TOKEN_SECRET) {
      return NextResponse.json(
        { 
          error: 'Mux credentials not configured',
          message: 'Please add MUX_TOKEN_ID and MUX_TOKEN_SECRET to your .env.local file',
          needsSetup: true
        },
        { status: 503 }
      )
    }

    // Create Mux direct upload
    const authHeader = 'Basic ' + Buffer.from(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`).toString('base64')
    
    const muxResponse = await fetch('https://api.mux.com/video/v1/uploads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({
        cors_origin: '*',
        new_asset_settings: {
          playback_policy: ['public'],
          passthrough: JSON.stringify({ creatorId, ...metadata }),
        },
      }),
    })

    if (!muxResponse.ok) {
      const errorData = await muxResponse.json()
      throw new Error(`Mux API error: ${JSON.stringify(errorData)}`)
    }

    const uploadData = await muxResponse.json()

    // Phase 5: Log successful upload attempt
    if (creatorId) {
      await logUploadAttempt(creatorId)
    }

    return NextResponse.json({
      uploadId: uploadData.data.id,
      uploadUrl: uploadData.data.url,
    })
  } catch (error) {
    console.error('Error creating Mux upload:', error)
    return NextResponse.json(
      { error: 'Failed to create upload URL', details: (error as Error).message },
      { status: 500 }
    )
  }
}

