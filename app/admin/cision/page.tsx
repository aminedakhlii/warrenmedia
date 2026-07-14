'use client'

import { FormEvent, useMemo, useState } from 'react'
import Link from 'next/link'

import AdminGuard from '../../components/AdminGuard'
import { supabase, type ContentType, type Title } from '../../lib/supabaseClient'
import type { CisionReleaseSummary, CisionSearchResponse } from '../../lib/cisionTypes'

function dateInput(daysAgo = 0) {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() - daysAgo)
  return date.toISOString().slice(0, 10)
}

async function adminFetch(url: string, init?: RequestInit) {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Your admin session has expired. Please sign in again.')

  const response = await fetch(url, {
    ...init,
    headers: {
      ...init?.headers,
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
    },
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok) throw new Error(payload?.error || `Request failed (${response.status})`)
  return payload
}

function CisionAdminContent() {
  const [filters, setFilters] = useState({
    keyword: '',
    company: '',
    language: 'en',
    startDate: dateInput(30),
    endDate: dateInput(),
  })
  const [releases, setReleases] = useState<CisionReleaseSummary[]>([])
  const [pagination, setPagination] = useState<CisionSearchResponse['pagination'] | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [contentType, setContentType] = useState<Extract<ContentType, 'film' | 'music_video'>>('film')
  const [category, setCategory] = useState<Title['category']>('new_releases')
  const [preview, setPreview] = useState<CisionReleaseSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [searched, setSearched] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const selectedReleases = useMemo(
    () => releases.filter((release) => selected.has(release.releaseId)),
    [releases, selected]
  )

  async function search(from = 0) {
    setLoading(true)
    setError('')
    setMessage('')
    try {
      const params = new URLSearchParams({
        from: String(from),
        size: '20',
        language: filters.language,
        startDate: filters.startDate,
        endDate: filters.endDate,
      })
      if (filters.keyword.trim()) params.set('keyword', filters.keyword.trim())
      if (filters.company.trim()) params.set('company', filters.company.trim())
      const result = (await adminFetch(
        `/api/admin/cision/releases?${params.toString()}`
      )) as CisionSearchResponse
      setReleases(result.releases)
      setPagination(result.pagination)
      setSelected(new Set())
      setPreview(null)
      setSearched(true)
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleSearch(event: FormEvent) {
    event.preventDefault()
    await search(0)
  }

  function toggleSelected(releaseId: string) {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(releaseId)) next.delete(releaseId)
      else next.add(releaseId)
      return next
    })
  }

  async function importSelected() {
    if (!selected.size) return
    setImporting(true)
    setError('')
    setMessage('')
    try {
      const result = (await adminFetch('/api/admin/cision/import', {
        method: 'POST',
        body: JSON.stringify({
          releaseIds: [...selected],
          contentType,
          category,
        }),
      })) as {
        imported: { releaseId: string; titleId: string; updated: boolean }[]
        failed: { releaseId: string; error: string }[]
      }

      const importedById = new Map(result.imported.map((item) => [item.releaseId, item.titleId]))
      setReleases((current) =>
        current.map((release) => ({
          ...release,
          importedTitleId: importedById.get(release.releaseId) || release.importedTitleId,
        }))
      )
      setSelected(new Set(result.failed.map((item) => item.releaseId)))
      setMessage(
        `${result.imported.length} title${result.imported.length === 1 ? '' : 's'} published.` +
          (result.failed.length ? ` ${result.failed.length} failed.` : '')
      )
      if (result.failed.length) {
        setError(result.failed.map((item) => `${item.releaseId}: ${item.error}`).join(' '))
      }
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Cision Video Import</h1>
            <p className="text-sm text-gray-400 mt-1">
              Search Cision releases with video and publish selected items as Warren Media titles.
            </p>
          </div>
          <Link href="/admin" className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm">
            ← Admin dashboard
          </Link>
        </div>

        <form onSubmit={handleSearch} className="rounded-xl border border-gray-800 bg-gray-900 p-5 mb-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-sm text-gray-300">
              Keyword
              <input
                value={filters.keyword}
                onChange={(event) => setFilters({ ...filters, keyword: event.target.value })}
                placeholder="Product, person, topic…"
                className="mt-1 w-full rounded bg-gray-950 border border-gray-700 px-3 py-2 text-white"
              />
            </label>
            <label className="text-sm text-gray-300">
              Company (exact Cision name)
              <input
                value={filters.company}
                onChange={(event) => setFilters({ ...filters, company: event.target.value })}
                placeholder="Company name"
                className="mt-1 w-full rounded bg-gray-950 border border-gray-700 px-3 py-2 text-white"
              />
            </label>
            <label className="text-sm text-gray-300">
              Language
              <select
                value={filters.language}
                onChange={(event) => setFilters({ ...filters, language: event.target.value })}
                className="mt-1 w-full rounded bg-gray-950 border border-gray-700 px-3 py-2 text-white"
              >
                <option value="en">English</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="es">Spanish</option>
                <option value="it">Italian</option>
                <option value="pt">Portuguese</option>
              </select>
            </label>
            <label className="text-sm text-gray-300">
              Published from
              <input
                type="date"
                required
                value={filters.startDate}
                onChange={(event) => setFilters({ ...filters, startDate: event.target.value })}
                className="mt-1 w-full rounded bg-gray-950 border border-gray-700 px-3 py-2 text-white"
              />
            </label>
            <label className="text-sm text-gray-300">
              Published through
              <input
                type="date"
                required
                value={filters.endDate}
                onChange={(event) => setFilters({ ...filters, endDate: event.target.value })}
                className="mt-1 w-full rounded bg-gray-950 border border-gray-700 px-3 py-2 text-white"
              />
            </label>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded bg-amber-500 hover:bg-amber-400 disabled:opacity-50 px-4 py-2 font-semibold text-black"
              >
                {loading ? 'Searching…' : 'Search Cision'}
              </button>
            </div>
          </div>
        </form>

        {(error || message) && (
          <div className="mb-5 space-y-2">
            {message && <p className="rounded border border-green-900 bg-green-950/40 p-3 text-green-300">{message}</p>}
            {error && <p className="rounded border border-red-900 bg-red-950/40 p-3 text-red-300">{error}</p>}
          </div>
        )}

        {selected.size > 0 && (
          <section className="sticky top-2 z-20 mb-5 rounded-xl border border-amber-500/40 bg-gray-900/95 backdrop-blur p-4 shadow-xl">
            <div className="flex flex-wrap items-end gap-3">
              <p className="font-semibold mr-auto">{selected.size} selected</p>
              <label className="text-xs text-gray-400">
                Content type
                <select
                  value={contentType}
                  onChange={(event) => setContentType(event.target.value as typeof contentType)}
                  className="block mt-1 rounded bg-gray-950 border border-gray-700 px-3 py-2 text-sm text-white"
                >
                  <option value="film">Film</option>
                  <option value="music_video">Music video</option>
                </select>
              </label>
              <label className="text-xs text-gray-400">
                Category
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value as Title['category'])}
                  className="block mt-1 rounded bg-gray-950 border border-gray-700 px-3 py-2 text-sm text-white"
                >
                  <option value="new_releases">New Releases</option>
                  <option value="trending">Trending</option>
                  <option value="originals">Originals</option>
                  <option value="music_videos">Music Videos</option>
                </select>
              </label>
              <button
                type="button"
                onClick={importSelected}
                disabled={importing}
                className="rounded bg-amber-500 hover:bg-amber-400 disabled:opacity-50 px-5 py-2 font-semibold text-black"
              >
                {importing ? 'Publishing…' : 'Publish selected'}
              </button>
            </div>
          </section>
        )}

        {preview && (
          <section className="mb-6 rounded-xl border border-gray-800 bg-black overflow-hidden">
            <div className="aspect-video bg-black">
              <video
                key={preview.releaseId}
                src={preview.multimedia.find((media) => media.type.startsWith('video'))?.url}
                controls
                preload="metadata"
                poster={preview.multimedia.find((media) => media.thumbnailUrl)?.thumbnailUrl || undefined}
                className="w-full h-full"
              />
            </div>
            <div className="p-4 flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold">{preview.title}</p>
                <p className="text-xs text-gray-500 mt-1">{preview.releaseId}</p>
              </div>
              <button type="button" onClick={() => setPreview(null)} className="text-sm text-gray-400 hover:text-white">
                Close preview
              </button>
            </div>
          </section>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {releases.map((release) => {
            const checked = selected.has(release.releaseId)
            const video = release.multimedia.find((media) => media.type.startsWith('video'))
            const thumbnail = video?.thumbnailUrl || release.multimedia.find((media) => media.thumbnailUrl)?.thumbnailUrl
            return (
              <article
                key={release.releaseId}
                className={`rounded-xl border bg-gray-900 p-4 transition ${
                  checked ? 'border-amber-500' : 'border-gray-800'
                }`}
              >
                <div className="flex gap-4">
                  <div className="w-28 h-20 shrink-0 rounded bg-gray-950 overflow-hidden">
                    {thumbnail ? (
                      <img src={thumbnail} alt="" loading="lazy" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-gray-600">Video</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSelected(release.releaseId)}
                        aria-label={`Select ${release.title}`}
                        className="mt-1 accent-amber-500"
                      />
                      <div className="min-w-0">
                        <h2 className="font-semibold leading-snug">{release.title}</h2>
                        <p className="text-xs text-gray-500 mt-1">
                          {release.date ? new Date(release.date).toLocaleDateString() : 'Unknown date'}
                          {release.companies.length ? ` · ${release.companies.join(', ')}` : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                {release.summary && <p className="text-sm text-gray-400 mt-3 line-clamp-3">{release.summary}</p>}
                <div className="flex items-center justify-between gap-3 mt-4">
                  <button
                    type="button"
                    onClick={() => setPreview(release)}
                    className="text-sm text-amber-400 hover:text-amber-300"
                  >
                    Preview video
                  </button>
                  {release.importedTitleId && (
                    <span className="text-xs text-green-400">Already published</span>
                  )}
                </div>
              </article>
            )
          })}
        </div>

        {searched && !loading && releases.length === 0 && (
          <p className="py-16 text-center text-gray-500">No Cision video releases matched this search.</p>
        )}

        {pagination && (pagination.from > 0 || pagination.hasNext) && (
          <div className="flex justify-center gap-3 mt-8">
            <button
              type="button"
              disabled={loading || pagination.from === 0}
              onClick={() => search(Math.max(0, pagination.from - pagination.size))}
              className="rounded bg-gray-800 px-4 py-2 text-sm disabled:opacity-40"
            >
              Previous
            </button>
            <span className="px-3 py-2 text-sm text-gray-500">
              {pagination.from + 1}–{Math.min(pagination.from + pagination.size, pagination.totalItems)} of{' '}
              {pagination.totalItems}
            </span>
            <button
              type="button"
              disabled={loading || !pagination.hasNext}
              onClick={() => search(pagination.from + pagination.size)}
              className="rounded bg-gray-800 px-4 py-2 text-sm disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}

        {selectedReleases.length > 0 && (
          <p className="sr-only">{selectedReleases.map((release) => release.title).join(', ')}</p>
        )}
      </div>
    </div>
  )
}

export default function CisionAdminPage() {
  return (
    <AdminGuard>
      <CisionAdminContent />
    </AdminGuard>
  )
}
