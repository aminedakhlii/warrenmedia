'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  supabase,
  getTitlesForPlaylistPicker,
  slugifyPlaylistSlug,
  type Title,
  type Playlist,
  type PlaylistType,
} from '../../lib/supabaseClient'
import AdminGuard from '../../components/AdminGuard'

const MIN_ITEMS = 10

function AdminPlaylistsContent() {
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [loadingList, setLoadingList] = useState(true)

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [playlistType, setPlaylistType] = useState<PlaylistType>('movies')
  const [pickerTitles, setPickerTitles] = useState<Title[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [filterText, setFilterText] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const fetchPlaylists = useCallback(async () => {
    setLoadingList(true)
    const { data } = await supabase.from('playlists').select('*').order('created_at', { ascending: false })
    setPlaylists((data || []) as Playlist[])
    setLoadingList(false)
  }, [])

  useEffect(() => {
    fetchPlaylists()
  }, [fetchPlaylists])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const titles = await getTitlesForPlaylistPicker(playlistType)
      if (!cancelled) setPickerTitles(titles)
    })()
    return () => {
      cancelled = true
    }
  }, [playlistType])

  useEffect(() => {
    if (!slugTouched && name.trim()) {
      setSlug(slugifyPlaylistSlug(name))
    }
  }, [name, slugTouched])

  const toggleTitle = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const moveSelected = (id: string, dir: -1 | 1) => {
    setSelectedIds((prev) => {
      const i = prev.indexOf(id)
      if (i < 0) return prev
      const j = i + dir
      if (j < 0 || j >= prev.length) return prev
      const next = [...prev]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }

  const filteredPicker = pickerTitles.filter((t) =>
    filterText.trim() ? t.title.toLowerCase().includes(filterText.trim().toLowerCase()) : true
  )

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')
    const s = slug.trim()
    if (!name.trim() || !s) {
      setMessage('Name and slug are required.')
      return
    }
    if (selectedIds.length < MIN_ITEMS) {
      setMessage(`Select at least ${MIN_ITEMS} titles with playback (current: ${selectedIds.length}).`)
      return
    }

    setSaving(true)
    try {
      const { data: pl, error: pErr } = await supabase
        .from('playlists')
        .insert({
          name: name.trim(),
          slug: s,
          playlist_type: playlistType,
          is_active: true,
        })
        .select()
        .single()

      if (pErr) throw pErr

      const rows = selectedIds.map((title_id, index) => ({
        playlist_id: pl.id,
        title_id,
        sort_order: index,
      }))

      const { error: iErr } = await supabase.from('playlist_items').insert(rows)
      if (iErr) {
        await supabase.from('playlists').delete().eq('id', pl.id)
        throw iErr
      }

      setMessage('Playlist created.')
      setName('')
      setSlug('')
      setSlugTouched(false)
      setSelectedIds([])
      setFilterText('')
      fetchPlaylists()
    } catch (err: unknown) {
      setMessage('Error: ' + (err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const deletePlaylist = async (id: string) => {
    if (!confirm('Delete this playlist and all its items?')) return
    const { error } = await supabase.from('playlists').delete().eq('id', id)
    if (error) setMessage('Delete failed: ' + error.message)
    else {
      setMessage('Playlist deleted.')
      fetchPlaylists()
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <h1 className="text-3xl font-bold">Playlists</h1>
          <div className="flex gap-3">
            <Link
              href="/watch/playlists"
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition"
            >
              View public list
            </Link>
            <Link href="/admin" className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition">
              ← Admin
            </Link>
          </div>
        </div>

        {message && (
          <div
            className={`mb-6 p-4 rounded-lg text-sm ${
              message.startsWith('Error') || message.includes('failed')
                ? 'bg-red-900/40 border border-red-700'
                : 'bg-green-900/30 border border-green-700'
            }`}
          >
            {message}
          </div>
        )}

        <section className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-10">
          <h2 className="text-xl font-semibold mb-4">Create playlist</h2>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Name *</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-800 rounded-lg border border-gray-700 focus:ring-2 focus:ring-amber-glow outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Slug * (URL)</label>
                <input
                  value={slug}
                  onChange={(e) => {
                    setSlugTouched(true)
                    setSlug(e.target.value)
                  }}
                  className="w-full px-4 py-2 bg-gray-800 rounded-lg border border-gray-700 focus:ring-2 focus:ring-amber-glow outline-none font-mono text-sm"
                  placeholder="my-curated-movies"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Playlist type *</label>
              <select
                value={playlistType}
                onChange={(e) => {
                  setPlaylistType(e.target.value as PlaylistType)
                  setSelectedIds([])
                }}
                className="w-full max-w-md px-4 py-2 bg-gray-800 rounded-lg border border-gray-700"
              >
                <option value="movies">Movies (films only)</option>
                <option value="music_videos">Music videos only</option>
              </select>
            </div>

            <p className="text-sm text-gray-500">
              Only titles with a Mux playback ID are listed. Order = selection order; use arrows to reorder
              selected rows. Minimum <strong className="text-amber-400">{MIN_ITEMS}</strong> items required.
            </p>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Filter titles</label>
              <input
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder="Search by title…"
                className="w-full max-w-md px-4 py-2 bg-gray-800 rounded-lg border border-gray-700 text-sm"
              />
            </div>

            <div className="max-h-[360px] overflow-y-auto border border-gray-800 rounded-lg divide-y divide-gray-800">
              {filteredPicker.map((t) => (
                <label
                  key={t.id}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-gray-800/80 cursor-pointer text-sm"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(t.id)}
                    onChange={() => toggleTitle(t.id)}
                    className="rounded border-gray-600"
                  />
                  <img
                    src={t.poster_url}
                    alt=""
                    className="w-10 h-14 object-cover rounded shrink-0 bg-gray-800"
                    loading="lazy"
                    decoding="async"
                  />
                  <span className="flex-1 truncate">{t.title}</span>
                </label>
              ))}
              {filteredPicker.length === 0 && (
                <p className="p-4 text-gray-500 text-sm">No matching titles. Add films or music videos with playback first.</p>
              )}
            </div>

            {selectedIds.length > 0 && (
              <div className="border border-amber-500/30 rounded-lg p-3 bg-gray-900/80">
                <p className="text-xs text-amber-400/90 mb-2">
                  Selected {selectedIds.length} (min {MIN_ITEMS})
                </p>
                <ul className="space-y-1 max-h-40 overflow-y-auto text-sm">
                  {selectedIds.map((id, idx) => {
                    const t = pickerTitles.find((x) => x.id === id)
                    if (!t) return null
                    return (
                      <li key={id} className="flex items-center gap-2 text-gray-300">
                        <span className="text-gray-500 w-6">{idx + 1}.</span>
                        <span className="flex-1 truncate">{t.title}</span>
                        <button
                          type="button"
                          onClick={() => moveSelected(id, -1)}
                          className="px-2 py-0.5 bg-gray-800 rounded text-xs"
                          aria-label="Move up"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => moveSelected(id, 1)}
                          className="px-2 py-0.5 bg-gray-800 rounded text-xs"
                          aria-label="Move down"
                        >
                          ↓
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}

            <button
              type="submit"
              disabled={saving || selectedIds.length < MIN_ITEMS}
              className="px-6 py-3 bg-amber-glow hover:bg-amber-600 text-black font-semibold rounded-lg disabled:opacity-40 transition"
            >
              {saving ? 'Saving…' : 'Save playlist'}
            </button>
          </form>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Existing playlists</h2>
          {loadingList ? (
            <p className="text-gray-500">Loading…</p>
          ) : playlists.length === 0 ? (
            <p className="text-gray-500 text-sm">None yet.</p>
          ) : (
            <ul className="space-y-2">
              {playlists.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-2 bg-gray-900 border border-gray-800 rounded-lg px-4 py-3"
                >
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-gray-500 font-mono">
                      /watch/playlists/{p.slug} · {p.playlist_type}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/watch/playlists/${p.slug}`}
                      className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-sm"
                    >
                      Watch
                    </Link>
                    <button
                      type="button"
                      onClick={() => deletePlaylist(p.id)}
                      className="px-3 py-1.5 bg-red-900/60 hover:bg-red-800 rounded text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

export default function AdminPlaylistsPage() {
  return (
    <AdminGuard>
      <AdminPlaylistsContent />
    </AdminGuard>
  )
}
