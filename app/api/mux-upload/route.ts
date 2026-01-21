import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { creatorId, metadata } = await request.json()

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

