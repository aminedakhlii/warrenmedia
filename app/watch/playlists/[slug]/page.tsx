'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import MuxPlayer from '@mux/mux-player-react'
import {
  getPlaylistBySlug,
  getPlaylistItemsWithTitles,
  type Title,
  type Playlist,
} from '../../../lib/supabaseClient'

function getMuxMedia(el: unknown): HTMLMediaElement | null {
  if (!el || typeof el !== 'object') return null
  const anyEl = el as { media?: HTMLMediaElement }
  return anyEl.media ?? (el as HTMLMediaElement)
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function PlaylistWatchPage() {
  const params = useParams()
  const slug = typeof params?.slug === 'string' ? params.slug : ''

  const [playlist, setPlaylist] = useState<Playlist | null>(null)
  const [playable, setPlayable] = useState<Title[]>([])
  const [allItems, setAllItems] = useState<{ sort_order: number; title: Title }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [currentIndex, setCurrentIndex] = useState(0)
  const playerRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const volumeBeforeMute = useRef(1)

  const nowPlaying = playable[currentIndex] ?? null
  const playbackId = nowPlaying?.mux_playback_id ?? null
  const total = playable.length

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      if (!slug) {
        setError('Invalid playlist URL.')
        setLoading(false)
        return
      }
      const pl = await getPlaylistBySlug(slug)
      if (cancelled) return
      if (!pl) {
        setError('Playlist not found or inactive.')
        setLoading(false)
        return
      }
      const items = await getPlaylistItemsWithTitles(pl.id)
      if (cancelled) return
      setPlaylist(pl)
      setAllItems(items)
      const ready = items
        .map((x) => x.title)
        .filter((t) => t.mux_playback_id && String(t.mux_playback_id).trim().length > 0)
      setPlayable(ready)
      if (ready.length === 0) {
        setError('No playable videos in this playlist (missing Mux playback).')
      }
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [slug])

  const goToNext = useCallback(() => {
    if (playable.length === 0) return
    setCurrentIndex((i) => (i + 1 >= playable.length ? 0 : i + 1))
  }, [playable.length])

  const goToPrev = useCallback(() => {
    if (playable.length === 0) return
    setCurrentIndex((i) => (i - 1 < 0 ? playable.length - 1 : i - 1))
  }, [playable.length])

  const handleEnded = useCallback(() => {
    goToNext()
  }, [goToNext])

  const handleTimeUpdate = useCallback(() => {
    const media = getMuxMedia(playerRef.current)
    if (media) setCurrentTime(media.currentTime)
  }, [])

  const handleLoadedMetadata = useCallback(() => {
    const media = getMuxMedia(playerRef.current)
    if (media) setDuration(media.duration)
  }, [])

  const seek = useCallback(
    (seconds: number) => {
      const media = getMuxMedia(playerRef.current)
      if (!media) return
      const t = Math.max(0, Math.min(duration || 0, seconds))
      media.currentTime = t
      setCurrentTime(t)
    },
    [duration]
  )

  const setVolumeAndApply = useCallback((v: number, mute = false) => {
    const val = Math.max(0, Math.min(1, v))
    setVolume(val)
    if (!mute) {
      setIsMuted(false)
      volumeBeforeMute.current = val
    }
    const media = getMuxMedia(playerRef.current)
    if (media) {
      media.muted = mute
      media.volume = mute ? 0 : val
    }
  }, [])

  const toggleMute = useCallback(() => {
    if (isMuted) {
      setVolumeAndApply(volumeBeforeMute.current)
    } else {
      volumeBeforeMute.current = volume
      setVolumeAndApply(0, true)
      setIsMuted(true)
    }
  }, [isMuted, volume, setVolumeAndApply])

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    if (document.fullscreenElement) document.exitFullscreen()
    else el.requestFullscreen()
  }, [])

  useEffect(() => {
    const el = playerRef.current
    if (!el || !playbackId) return
    const media = getMuxMedia(el)
    const onEnded = () => goToNext()
    media?.addEventListener('ended', onEnded)
    return () => media?.removeEventListener('ended', onEnded)
  }, [playbackId, goToNext])

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const media = getMuxMedia(playerRef.current)
      if (!media) return
      media.volume = isMuted ? 0 : volume
      media.muted = isMuted
    })
    return () => cancelAnimationFrame(id)
  }, [playbackId, currentIndex, nowPlaying?.id, volume, isMuted])

  useEffect(() => {
    if (!playbackId) return
    const m = getMuxMedia(playerRef.current)
    m?.play?.().catch(() => {})
  }, [playbackId])

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const media = getMuxMedia(playerRef.current)
    if (!media || duration <= 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    seek(x * duration)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-gray-400">
        Loading playlist…
      </div>
    )
  }

  if (error && playable.length === 0) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-gray-400 max-w-md">{error}</p>
        <Link href="/watch/playlists" className="text-amber-400 hover:underline">
          All playlists
        </Link>
        <Link href="/" className="text-gray-500 text-sm hover:text-gray-300">
          Home
        </Link>
      </div>
    )
  }

  if (!playlist || total === 0) {
    return null
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <header className="flex-shrink-0 flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-gray-800/80">
        <Link href="/watch/playlists" className="text-sm text-amber-400 hover:text-amber-300">
          ← Playlists
        </Link>
        <div className="text-right min-w-0">
          <p className="text-xs text-gray-500 truncate">{playlist.name}</p>
          {nowPlaying && (
            <p className="text-sm font-medium truncate">
              {nowPlaying.title}{' '}
              <span className="text-gray-500 font-normal">
                ({currentIndex + 1} of {total})
              </span>
            </p>
          )}
        </div>
      </header>

      <div ref={containerRef} className="flex-1 flex flex-col min-h-0">
        <div className="relative flex-1 min-h-[38vh] bg-black">
          {playbackId ? (
            <MuxPlayer
              ref={playerRef}
              key={nowPlaying?.id}
              playbackId={playbackId}
              streamType="on-demand"
              autoPlay="any"
              onEnded={handleEnded}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              className="w-full h-full"
              style={
                {
                  '--controls': 'none',
                  '--media-object-fit': 'contain',
                } as React.CSSProperties
              }
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm">
              No playback
            </div>
          )}
        </div>

        <div className="flex-shrink-0 bg-gray-950 border-t border-gray-800 px-3 py-2">
          <div
            className="h-1.5 bg-gray-800 rounded-full cursor-pointer mb-2"
            onClick={handleProgressClick}
            role="presentation"
          >
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-75"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={goToPrev}
              disabled={total < 2}
              className="px-2 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-sm disabled:opacity-40"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => {
                const m = getMuxMedia(playerRef.current)
                if (!m) return
                if (isPlaying) m.pause()
                else m.play().catch(() => {})
              }}
              className="px-3 py-1.5 rounded bg-amber-glow text-black font-semibold text-sm"
            >
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            <button
              type="button"
              onClick={goToNext}
              disabled={total < 2}
              className="px-2 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-sm disabled:opacity-40"
            >
              Next
            </button>
            <span className="text-xs text-gray-500 tabular-nums">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
            <div className="flex-1" />
            <button
              type="button"
              onClick={toggleMute}
              className="px-2 py-1.5 rounded bg-gray-800 text-sm"
              aria-label="Mute"
            >
              {isMuted ? 'Unmute' : 'Vol'}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={isMuted ? 0 : volume}
              onChange={(e) => setVolumeAndApply(parseFloat(e.target.value))}
              className="w-20 h-1 accent-amber-500"
            />
            <button
              type="button"
              onClick={toggleFullscreen}
              className="px-2 py-1.5 rounded bg-gray-800 text-sm"
            >
              Fullscreen
            </button>
          </div>
        </div>
      </div>

      <section className="flex-shrink-0 border-t border-gray-800 bg-black px-3 py-4 max-h-[40vh] overflow-y-auto">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Queue</h2>
        <ul className="space-y-1">
          {allItems.map(({ sort_order, title: t }) => {
            const playableIdx = playable.findIndex((p) => p.id === t.id)
            const isCurrent = playableIdx === currentIndex && playableIdx >= 0
            const missing = !t.mux_playback_id
            return (
              <li key={t.id}>
                <button
                  type="button"
                  disabled={missing}
                  onClick={() => {
                    if (missing) return
                    setCurrentIndex(playableIdx)
                  }}
                  className={`w-full flex items-center gap-3 text-left px-2 py-2 rounded-lg text-sm transition ${
                    isCurrent
                      ? 'bg-amber-500/15 ring-1 ring-amber-500/50 text-white'
                      : 'hover:bg-gray-900 text-gray-300'
                  } ${missing ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  <span className="text-gray-500 w-8 text-right tabular-nums">{sort_order + 1}</span>
                  <img
                    src={t.poster_url}
                    alt=""
                    className="w-14 h-20 object-cover rounded bg-gray-800 shrink-0"
                    loading="lazy"
                    decoding="async"
                  />
                  <span className="flex-1 truncate">
                    {t.title}
                    {missing && <span className="block text-xs text-red-400">No playback</span>}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
