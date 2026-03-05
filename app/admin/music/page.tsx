'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  supabase,
  getMusicChannelSettings,
  getMusicChannelPlaylist,
  type Title,
  type MusicChannelSettings,
} from '../../lib/supabaseClient'
import AdminGuard from '../../components/AdminGuard'

type PlaylistItem = { id: string; title_id: string; position: number; is_active: boolean; title: Title }

function AdminMusicContent() {
  const [settings, setSettings] = useState<MusicChannelSettings | null>(null)
  const [playlist, setPlaylist] = useState<PlaylistItem[]>([])
  const [musicVideos, setMusicVideos] = useState<Title[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [adPlaybackId, setAdPlaybackId] = useState('')
  const [adDuration, setAdDuration] = useState(15)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    try {
      const [settingsData, playlistData] = await Promise.all([
        getMusicChannelSettings(),
        getMusicChannelPlaylist(),
      ])
      setSettings(settingsData ?? null)
      setPlaylist((playlistData as PlaylistItem[]) ?? [])
      if (settingsData) {
        setAdPlaybackId(settingsData.ad_playback_id ?? '')
        setAdDuration(settingsData.ad_duration_seconds ?? 15)
      }

      const { data: titles } = await supabase
        .from('titles')
        .select('*')
        .eq('content_type', 'music_video')
        .order('title')
      setMusicVideos(titles ?? [])
    } catch (error) {
      console.error(error)
      setMessage('Error loading data')
    } finally {
      setLoading(false)
    }
  }

  async function toggleLive() {
    if (!settings) return
    setLoading(true)
    setMessage('')
    try {
      const { error } = await supabase
        .from('music_channel_settings')
        .update({ is_live: !settings.is_live, updated_at: new Date().toISOString() })
        .eq('id', settings.id)
      if (error) throw error
      setMessage('Live status updated')
      fetchData()
    } catch (e) {
      setMessage('Error: ' + (e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  async function saveAdConfig() {
    if (!settings) return
    setLoading(true)
    setMessage('')
    try {
      const { error } = await supabase
        .from('music_channel_settings')
        .update({
          ad_playback_id: adPlaybackId.trim() || null,
          ad_duration_seconds: adDuration,
          updated_at: new Date().toISOString(),
        })
        .eq('id', settings.id)
      if (error) throw error
      setMessage('Pre-roll ad settings saved')
      fetchData()
    } catch (e) {
      setMessage('Error: ' + (e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  async function addToPlaylist(titleId: string) {
    setMessage('')
    const maxPos = playlist.length ? Math.max(...playlist.map((p) => p.position)) : 0
    try {
      const { error } = await supabase.from('music_channel_playlist').insert({
        title_id: titleId,
        position: maxPos + 1,
        is_active: true,
      })
      if (error) throw error
      setMessage('Added to playlist')
      fetchData()
    } catch (e) {
      setMessage('Error: ' + (e as Error).message)
    }
  }

  async function removeFromPlaylist(playlistItemId: string) {
    setMessage('')
    try {
      const { error } = await supabase
        .from('music_channel_playlist')
        .delete()
        .eq('id', playlistItemId)
      if (error) throw error
      setMessage('Removed from playlist')
      fetchData()
    } catch (e) {
      setMessage('Error: ' + (e as Error).message)
    }
  }

  async function moveItem(index: number, direction: 'up' | 'down') {
    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index >= playlist.length - 1) return
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    const a = playlist[index]
    const b = playlist[swapIndex]
    if (!a || !b) return
    setMessage('')
    try {
      await supabase
        .from('music_channel_playlist')
        .update({ position: b.position })
        .eq('id', a.id)
      await supabase
        .from('music_channel_playlist')
        .update({ position: a.position })
        .eq('id', b.id)
      setMessage('Order updated')
      fetchData()
    } catch (e) {
      setMessage('Error: ' + (e as Error).message)
    }
  }

  const inPlaylist = new Set(playlist.map((p) => p.title_id))
  const availableToAdd = musicVideos.filter((t) => !inPlaylist.has(t.id))

  if (loading && !settings) {
    return (
      <div className="p-8">
        <p className="text-gray-400">Loading...</p>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Music Channel</h1>
        <Link href="/admin/titles" className="text-sm text-gray-400 hover:text-white">
          ← Admin: Titles
        </Link>
      </div>

      {message && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            message.startsWith('Error') ? 'bg-red-900/50' : 'bg-green-900/50'
          }`}
        >
          {message}
        </div>
      )}

      {/* Settings */}
      <div className="bg-gray-900 rounded-lg p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Channel Settings</h2>
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Live status</span>
            <button
              onClick={toggleLive}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                settings?.is_live ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              {settings?.is_live ? 'Live' : 'Off'}
            </button>
          </div>
        </div>
        <div className="border-t border-gray-800 pt-4 mt-4">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Pre-roll ad (before first video)</h3>
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Mux Playback ID or URL</label>
              <input
                type="text"
                value={adPlaybackId}
                onChange={(e) => setAdPlaybackId(e.target.value)}
                placeholder="Optional"
                className="w-64 px-3 py-2 bg-gray-800 rounded focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Duration (seconds)</label>
              <input
                type="number"
                value={adDuration}
                onChange={(e) => setAdDuration(parseInt(e.target.value, 10) || 15)}
                min={5}
                max={60}
                className="w-20 px-3 py-2 bg-gray-800 rounded focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <button
              onClick={saveAdConfig}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 rounded-lg text-sm font-medium"
            >
              Save
            </button>
          </div>
        </div>
      </div>

      {/* Playlist */}
      <div className="bg-gray-900 rounded-lg p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Playlist</h2>
        <div className="space-y-2 mb-6">
          {playlist.map((item, index) => (
            <div
              key={item.id}
              className="flex items-center gap-4 p-3 bg-gray-800 rounded-lg"
            >
              <div className="flex items-center gap-1">
                <button
                  onClick={() => moveItem(index, 'up')}
                  disabled={index === 0}
                  className="p-1 rounded hover:bg-gray-700 disabled:opacity-30"
                  aria-label="Move up"
                >
                  ↑
                </button>
                <button
                  onClick={() => moveItem(index, 'down')}
                  disabled={index === playlist.length - 1}
                  className="p-1 rounded hover:bg-gray-700 disabled:opacity-30"
                  aria-label="Move down"
                >
                  ↓
                </button>
              </div>
              <span className="text-gray-500 w-6">{index + 1}.</span>
              <img
                src={item.title?.poster_url}
                alt=""
                className="w-12 h-12 object-cover rounded"
              />
              <span className="flex-1 font-medium">{item.title?.title ?? item.title_id}</span>
              <button
                onClick={() => removeFromPlaylist(item.id)}
                className="px-3 py-1 text-sm bg-red-600/80 hover:bg-red-600 rounded"
              >
                Remove
              </button>
            </div>
          ))}
          {playlist.length === 0 && (
            <p className="text-gray-500 py-4">Playlist is empty. Add music videos below.</p>
          )}
        </div>

        <h3 className="text-sm font-medium text-gray-400 mb-2">Add to playlist</h3>
        {availableToAdd.length === 0 ? (
          <p className="text-gray-500 text-sm">
            No music videos available to add. Create titles with type &quot;Music Video&quot; in Manage Titles.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {availableToAdd.map((t) => (
              <button
                key={t.id}
                onClick={() => addToPlaylist(t.id)}
                className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm"
              >
                <img src={t.poster_url} alt="" className="w-8 h-8 object-cover rounded" />
                {t.title}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-4">
        <Link
          href="/music"
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 rounded-lg"
        >
          Open Music Channel →
        </Link>
        <Link href="/admin/titles" className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg">
          ← Back to Titles
        </Link>
      </div>
    </div>
  )
}

export default function AdminMusicPage() {
  return (
    <AdminGuard>
      <AdminMusicContent />
    </AdminGuard>
  )
}
