import { NextRequest, NextResponse } from 'next/server'

import { checkAdminAPI } from '../../../../lib/adminAuth'
import { CisionError, getCisionReleaseForImport } from '../../../../lib/cision'
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin'

const CONTENT_TYPES = new Set(['film', 'music_video'])
const CATEGORIES = new Set(['trending', 'originals', 'new_releases', 'music_videos'])

type ImportBody = {
  releaseIds?: unknown
  contentType?: unknown
  category?: unknown
}

export async function POST(request: NextRequest) {
  try {
    const admin = await checkAdminAPI(request.headers.get('authorization'))
    if (!admin.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = (await request.json().catch(() => null)) as ImportBody | null
    const releaseIds = Array.isArray(body?.releaseIds)
      ? [...new Set(body.releaseIds.filter((id): id is string => typeof id === 'string'))]
      : []
    const contentType = typeof body?.contentType === 'string' ? body.contentType : ''
    const category = typeof body?.category === 'string' ? body.category : ''

    if (!releaseIds.length || releaseIds.length > 20) {
      return NextResponse.json(
        { error: 'Select between 1 and 20 Cision releases' },
        { status: 400 }
      )
    }
    if (!CONTENT_TYPES.has(contentType) || !CATEGORIES.has(category)) {
      return NextResponse.json({ error: 'Invalid content type or category' }, { status: 400 })
    }

    const supabaseAdmin = getSupabaseAdmin()
    const imported: { releaseId: string; titleId: string; updated: boolean }[] = []
    const failed: { releaseId: string; error: string }[] = []

    for (const releaseId of releaseIds) {
      try {
        const release = await getCisionReleaseForImport(releaseId)
        const titleValues = {
          title: release.title,
          poster_url: release.posterUrl,
          content_type: contentType,
          category,
          runtime_seconds: 0,
          description: release.description,
          external_source: 'cision',
          external_id: release.releaseId,
          external_media_url: release.mediaUrl,
          external_media_type: release.mediaType,
          external_source_url: release.sourceUrl,
          source_published_at: release.publishedAt,
        }

        const { data: existing, error: lookupError } = await supabaseAdmin
          .from('titles')
          .select('id')
          .eq('external_source', 'cision')
          .eq('external_id', release.releaseId)
          .maybeSingle()
        if (lookupError) throw lookupError

        if (existing) {
          const { error } = await supabaseAdmin.from('titles').update(titleValues).eq('id', existing.id)
          if (error) throw error
          imported.push({ releaseId, titleId: existing.id, updated: true })
        } else {
          const { data, error } = await supabaseAdmin
            .from('titles')
            .insert({ ...titleValues, mux_playback_id: null })
            .select('id')
            .single()
          if (error) throw error
          imported.push({ releaseId, titleId: data.id, updated: false })
        }
      } catch (error) {
        failed.push({
          releaseId,
          error: error instanceof Error ? error.message : 'Import failed',
        })
      }
    }

    return NextResponse.json(
      { imported, failed },
      { status: imported.length ? 200 : 422 }
    )
  } catch (error) {
    if (error instanceof CisionError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    const message = error instanceof Error ? error.message : 'Unable to import from Cision'
    const status = /auth/i.test(message) ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
