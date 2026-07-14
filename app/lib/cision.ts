import 'server-only'

import { getSupabaseAdmin } from './supabaseAdmin'
import type {
  CisionMultimedia,
  CisionReleaseSummary,
  CisionSearchResponse,
} from './cisionTypes'

type JsonRecord = Record<string, unknown>

export class CisionError extends Error {
  constructor(
    message: string,
    public readonly status: number = 502
  ) {
    super(message)
    this.name = 'CisionError'
  }
}

function config() {
  const login = process.env.CISION_LOGIN
  const password = process.env.CISION_PASSWORD
  const client = process.env.CISION_CLIENT || login
  const baseUrl = process.env.CISION_API_BASE_URL || 'https://contentapi.cision.com'

  if (!login || !password || !client) {
    throw new CisionError('Cision credentials are not configured', 503)
  }

  let parsedBase: URL
  try {
    parsedBase = new URL(baseUrl)
  } catch {
    throw new CisionError('Cision API base URL is invalid', 503)
  }
  if (parsedBase.protocol !== 'https:') {
    throw new CisionError('Cision API base URL must use HTTPS', 503)
  }

  return { login, password, client, baseUrl: parsedBase.origin }
}

function parseCisionDate(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const match = value.match(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})([+-])(\d{2})(\d{2})$/
  )
  if (!match) {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
  }

  const [, year, month, day, hour, minute, second, sign, offsetHour, offsetMinute] = match
  const offset = `${sign}${offsetHour}:${offsetMinute}`
  const parsed = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}${offset}`)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

function asStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

function decodeEntities(text: string): string {
  const entities: Record<string, string> = {
    amp: '&',
    apos: "'",
    gt: '>',
    lt: '<',
    nbsp: ' ',
    quot: '"',
  }
  return text
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16))
    )
    .replace(/&([a-z]+);/gi, (entity, name: string) => entities[name.toLowerCase()] ?? entity)
}

function htmlToText(value: unknown): string {
  if (typeof value !== 'string') return ''
  return decodeEntities(
    value
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
  )
    .replace(/\s+/g, ' ')
    .trim()
}

function safeHttpsUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || !url.hostname) return null
    if (
      url.hostname === 'localhost' ||
      url.hostname === '127.0.0.1' ||
      url.hostname === '::1' ||
      url.hostname.endsWith('.local')
    ) {
      return null
    }
    return url.toString()
  } catch {
    return null
  }
}

function normalizeMultimedia(value: unknown): CisionMultimedia[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const row = item as JsonRecord
    const url = safeHttpsUrl(row.url)
    if (!url) return []
    return [
      {
        caption: typeof row.caption === 'string' ? row.caption : '',
        type: typeof row.type === 'string' ? row.type.toLowerCase() : '',
        url,
        thumbnailUrl: safeHttpsUrl(row.thumbnailurl),
      },
    ]
  })
}

function isVideo(media: CisionMultimedia): boolean {
  return media.type === 'video' || media.type.startsWith('video/')
}

function extractCanonicalUrl(body: unknown): string | null {
  if (typeof body !== 'string') return null
  const idMatch = body.match(/<a[^>]+id=["']PRNURL["'][^>]+href=["']([^"']+)/i)
  const hrefMatch = body.match(
    /href=["'](https:\/\/(?:www\.)?prnewswire\.com\/news-releases\/[^"']+)/i
  )
  return safeHttpsUrl(idMatch?.[1] || hrefMatch?.[1])
}

async function loginAndCache(): Promise<string> {
  const { login, password, client, baseUrl } = config()
  const response = await fetch(`${baseUrl}/api/v1.0/auth/login`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Client': client,
    },
    body: JSON.stringify({ login, pwd: password }),
    cache: 'no-store',
    signal: AbortSignal.timeout(12_000),
  })

  const payload = (await response.json().catch(() => null)) as JsonRecord | null
  if (!response.ok || typeof payload?.auth_token !== 'string') {
    const message =
      typeof payload?.message === 'string' ? payload.message : 'Cision authentication failed'
    throw new CisionError(message, response.status === 429 ? 429 : 502)
  }

  const parsedExpiry = parseCisionDate(payload.expires)
  const expiresAt = parsedExpiry || new Date(Date.now() + 50 * 60_000).toISOString()
  const { error } = await getSupabaseAdmin().from('cision_auth_cache').upsert({
    cache_key: 'default',
    auth_token: payload.auth_token,
    expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  })
  if (error) throw new CisionError(`Unable to cache Cision token: ${error.message}`, 500)
  return payload.auth_token
}

async function getToken(forceRefresh = false): Promise<string> {
  if (!forceRefresh) {
    const { data } = await getSupabaseAdmin()
      .from('cision_auth_cache')
      .select('auth_token, expires_at')
      .eq('cache_key', 'default')
      .maybeSingle()

    if (
      data?.auth_token &&
      new Date(data.expires_at).getTime() > Date.now() + 60_000
    ) {
      return data.auth_token
    }
  }
  return loginAndCache()
}

async function cisionGet(path: string, search?: URLSearchParams, retried = false): Promise<unknown> {
  const { client, baseUrl } = config()
  const token = await getToken(retried)
  const url = new URL(path, baseUrl)
  if (search) url.search = search.toString()

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Client': client,
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  })

  if (response.status === 401 && !retried) {
    return cisionGet(path, search, true)
  }

  const payload = (await response.json().catch(() => null)) as JsonRecord | null
  if (!response.ok) {
    const message =
      typeof payload?.message === 'string' ? payload.message : `Cision request failed (${response.status})`
    throw new CisionError(message, response.status === 429 ? 429 : 502)
  }
  return payload
}

export type CisionSearchInput = {
  keyword?: string
  company?: string
  language?: string
  startDate?: string
  endDate?: string
  from: number
  size: number
}

function toCisionUtcDate(date: string, endOfDay: boolean): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  return `${date.replace(/-/g, '')}T${endOfDay ? '235959' : '000000'}+0000`
}

export async function searchCisionReleases(
  input: CisionSearchInput
): Promise<CisionSearchResponse> {
  const params = new URLSearchParams({
    from: String(input.from),
    size: String(input.size),
    mm_type: 'video',
    fields: 'title|summary|date|release_id|company|language|multimedia',
  })
  if (input.keyword) params.set('keyword', input.keyword)
  if (input.company) params.set('company', input.company)
  if (input.language) params.set('language', input.language)
  const startDate = input.startDate ? toCisionUtcDate(input.startDate, false) : null
  const endDate = input.endDate ? toCisionUtcDate(input.endDate, true) : null
  if (startDate) params.set('startdate', startDate)
  if (endDate) params.set('enddate', endDate)

  const payload = (await cisionGet('/api/v1.0/releases', params)) as JsonRecord
  const rawRows = Array.isArray(payload.data) ? payload.data : []
  const releases = rawRows.flatMap((item): CisionReleaseSummary[] => {
    if (!item || typeof item !== 'object') return []
    const row = item as JsonRecord
    if (row.status === 'DELETED' || typeof row.release_id !== 'string') return []
    const multimedia = normalizeMultimedia(row.multimedia)
    if (!multimedia.some(isVideo)) return []
    return [{
      releaseId: row.release_id,
      title: typeof row.title === 'string' ? row.title : 'Untitled Cision release',
      summary: htmlToText(row.summary),
      date: parseCisionDate(row.date) || '',
      companies: asStrings(row.company),
      language: typeof row.language === 'string' ? row.language : null,
      sourceUrl: safeHttpsUrl(row.url),
      multimedia,
      importedTitleId: null,
    }]
  })

  const ids = releases.map((release) => release.releaseId)
  if (ids.length) {
    const { data } = await getSupabaseAdmin()
      .from('titles')
      .select('id, external_id')
      .eq('external_source', 'cision')
      .in('external_id', ids)
    const imported = new Map((data || []).map((row) => [row.external_id as string, row.id as string]))
    releases.forEach((release) => {
      release.importedTitleId = imported.get(release.releaseId) || null
    })
  }

  const pagination =
    payload.pagination && typeof payload.pagination === 'object'
      ? (payload.pagination as JsonRecord)
      : {}
  const totalItems = Number(pagination.total_items) || releases.length
  return {
    releases,
    pagination: {
      from: input.from,
      size: input.size,
      totalItems,
      hasNext: input.from + input.size < totalItems,
    },
  }
}

export type CisionImportRecord = {
  releaseId: string
  title: string
  description: string
  posterUrl: string
  mediaUrl: string
  mediaType: string
  sourceUrl: string | null
  publishedAt: string | null
}

export async function getCisionReleaseForImport(releaseId: string): Promise<CisionImportRecord> {
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(releaseId)) {
    throw new CisionError('Invalid Cision release ID', 400)
  }

  const payload = (await cisionGet(
    `/api/v1.0/releases/${encodeURIComponent(releaseId)}`
  )) as JsonRecord
  const row =
    payload.data && typeof payload.data === 'object' ? (payload.data as JsonRecord) : null
  if (!row) throw new CisionError('Cision release was not found', 404)

  const multimedia = normalizeMultimedia(row.multimedia)
  const video = multimedia.find(isVideo)
  if (!video) throw new CisionError('This Cision release has no playable video', 422)

  const title = typeof row.title === 'string' ? row.title.trim() : ''
  if (!title) throw new CisionError('Cision release has no title', 422)
  const subtitle = Array.isArray(row.sub_title)
    ? row.sub_title.filter((value): value is string => typeof value === 'string').join(' ')
    : row.sub_title
  const description = (htmlToText(row.summary) || htmlToText(subtitle) || htmlToText(row.body)).slice(
    0,
    2000
  )
  const posterUrl =
    video.thumbnailUrl ||
    multimedia.find((media) => media.thumbnailUrl)?.thumbnailUrl ||
    multimedia.find((media) => media.type === 'photo')?.url ||
    '/cision-video-placeholder.svg'

  return {
    releaseId,
    title,
    description,
    posterUrl,
    mediaUrl: video.url,
    mediaType: video.type || 'video',
    sourceUrl: extractCanonicalUrl(row.body),
    publishedAt: parseCisionDate(row.date),
  }
}
