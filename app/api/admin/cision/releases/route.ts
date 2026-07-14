import { NextRequest, NextResponse } from 'next/server'

import { checkAdminAPI } from '../../../../lib/adminAuth'
import { CisionError, searchCisionReleases } from '../../../../lib/cision'

export const dynamic = 'force-dynamic'

function defaultStartDate(): string {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() - 30)
  return date.toISOString().slice(0, 10)
}

export async function GET(request: NextRequest) {
  try {
    const admin = await checkAdminAPI(request.headers.get('authorization'))
    if (!admin.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const params = request.nextUrl.searchParams
    const from = Math.max(0, Number.parseInt(params.get('from') || '0', 10) || 0)
    const size = Math.min(50, Math.max(1, Number.parseInt(params.get('size') || '20', 10) || 20))
    const result = await searchCisionReleases({
      keyword: params.get('keyword')?.trim().slice(0, 200) || undefined,
      company: params.get('company')?.trim().slice(0, 200) || undefined,
      language: params.get('language')?.trim().slice(0, 12) || 'en',
      startDate: params.get('startDate') || defaultStartDate(),
      endDate: params.get('endDate') || new Date().toISOString().slice(0, 10),
      from,
      size,
    })
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof CisionError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    const message = error instanceof Error ? error.message : 'Unable to search Cision'
    const status = /auth/i.test(message) ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
