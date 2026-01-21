import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const uploadId = request.nextUrl.searchParams.get('uploadId')
    
    if (!uploadId) {
      return NextResponse.json({ error: 'Upload ID required' }, { status: 400 })
    }

    const MUX_TOKEN_ID = process.env.MUX_TOKEN_ID
    const MUX_TOKEN_SECRET = process.env.MUX_TOKEN_SECRET

    if (!MUX_TOKEN_ID || !MUX_TOKEN_SECRET) {
      return NextResponse.json({ error: 'Mux not configured' }, { status: 503 })
    }

    // Get upload status
    const authHeader = 'Basic ' + Buffer.from(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`).toString('base64')
    
    const response = await fetch(`https://api.mux.com/video/v1/uploads/${uploadId}`, {
      headers: {
        'Authorization': authHeader,
      },
    })

    if (!response.ok) {
      throw new Error('Failed to fetch upload status')
    }

    const data = await response.json()
    const upload = data.data

    // If upload has an asset, get the asset details
    if (upload.asset_id) {
      const assetResponse = await fetch(`https://api.mux.com/video/v1/assets/${upload.asset_id}`, {
        headers: {
          'Authorization': authHeader,
        },
      })

      if (assetResponse.ok) {
        const assetData = await assetResponse.json()
        const asset = assetData.data

        return NextResponse.json({
          status: upload.status,
          assetId: asset.id,
          playbackId: asset.playback_ids?.[0]?.id,
          ready: asset.status === 'ready',
          duration: asset.duration,
        })
      }
    }

    return NextResponse.json({
      status: upload.status,
      assetId: upload.asset_id,
      playbackId: null,
      ready: false,
    })
  } catch (error) {
    console.error('Error checking Mux status:', error)
    return NextResponse.json(
      { error: 'Failed to check status', details: (error as Error).message },
      { status: 500 }
    )
  }
}

