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

/**
 * Mux `new_asset_settings.passthrough` is max 255 characters.
 * We only keep tiny identifiers for optional Mux dashboard context.
 * Full title, description, and app state stay in Supabase — nothing in this repo reads passthrough.
 */
function buildMuxPassthrough(
  creatorId: string | undefined,
  metadata?: { title?: string; description?: string }
): string {
  const id = (creatorId ?? '').trim()
  const title = metadata?.title?.trim()
  if (!title) return JSON.stringify({ creatorId: id })

  for (let len = Math.min(title.length, 200); len >= 0; len--) {
    const s = JSON.stringify(
      len > 0 ? { creatorId: id, title: title.slice(0, len) } : { creatorId: id }
    )
    if (s.length <= 255) return s
  }
  return JSON.stringify({ creatorId: id })
}

/**
 * Mux direct-upload asset settings.
 *
 * Why playback often looks "720p" / basic:
 * - `video_quality: "basic"` is free encoding but uses a reduced ABR ladder (lower bitrates / fewer steps).
 * - Account default in the Mux dashboard is often `basic` if you never set `video_quality` on the API.
 * - The player (Mux Player) is not capped in our app; max visual quality is mostly from Mux encodes + source resolution.
 *
 * Set env (optional):
 * - MUX_VIDEO_QUALITY=basic | plus | premium  (plus/premium are billable; better ladders & quality)
 * - MUX_MAX_RESOLUTION_TIER=1080p | 1440p | 2160p  (caps encode/storage/stream max; default in Mux is 1080p if unset)
 */
function buildNewAssetSettings(
  creatorId: string | undefined,
  metadata?: { title?: string; description?: string }
): Record<string, unknown> {
  const settings: Record<string, unknown> = {
    playback_policies: ['public'],
    passthrough: buildMuxPassthrough(creatorId, metadata),
  }

  const vq = process.env.MUX_VIDEO_QUALITY
  if (vq === 'basic' || vq === 'plus' || vq === 'premium') {
    settings.video_quality = vq
  }

  const tier = process.env.MUX_MAX_RESOLUTION_TIER
  if (tier === '1080p' || tier === '1440p' || tier === '2160p') {
    settings.max_resolution_tier = tier
  }

  return settings
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
        new_asset_settings: buildNewAssetSettings(creatorId, metadata),
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

