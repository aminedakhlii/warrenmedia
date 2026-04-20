'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import MuxPlayer from '@mux/mux-player-react'
import {
  getMusicChannelSettings,
  getMusicChannelPlaylist,
  getFeatureFlag,
  type Title,
  type MusicChannelSettings,
} from '../lib/supabaseClient'
import PreRollAd from '../components/PreRollAd'
import AdSenseDisplay from '../components/AdSenseDisplay'
import MusicChannelEditorialSection from '../components/MusicChannelEditorialSection'

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

/** Mux Player custom element exposes the real media element as `.media`; `.volume` on the host often does nothing. */
function getMuxMedia(el: unknown): HTMLMediaElement | null {
  if (!el || typeof el !== 'object') return null
  const anyEl = el as { media?: HTMLMediaElement; volume?: number }
  return anyEl.media ?? (el as HTMLMediaElement)
}

export default function MusicChannelPage() {
  const [settings, setSettings] = useState<MusicChannelSettings | null>(null)
  const [playlist, setPlaylist] = useState<{ title: Title }[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showPreRoll, setShowPreRoll] = useState(false)
  const [adsEnabled, setAdsEnabled] = useState(false)
  const [recentlyPlayed, setRecentlyPlayed] = useState<Title[]>([])
  const [showNowPlaying, setShowNowPlaying] = useState(true)
  const [loading, setLoading] = useState(true)
  const [sessionId] = useState(() => crypto.randomUUID())
  const playerRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const nowPlayingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const volumeBeforeMute = useRef(1)

  const nowPlaying = playlist[currentIndex]?.title ?? null
  const playbackId = nowPlaying?.mux_playback_id ?? null
  const isLive = settings?.is_live ?? true

  // Load settings, playlist, and ads flag
  useEffect(() => {
    async function load() {
      const [settingsData, playlistData, adsOn] = await Promise.all([
        getMusicChannelSettings(),
        getMusicChannelPlaylist(),
        getFeatureFlag('ads_system'),
      ])
      setSettings(settingsData ?? null)
      setPlaylist(playlistData ?? [])
      setAdsEnabled(adsOn)
      setLoading(false)

      const hasAd = adsOn && settingsData?.ad_playback_id
      if (hasAd && playlistData?.length) {
        setShowPreRoll(true)
      }
    }
    load()
  }, [])

  const startPlaylist = () => {
    setShowPreRoll(false)
    if (playlist.length && playerRef.current?.play) {
      playerRef.current.play().catch(() => {})
    }
  }

  const goToNext = useCallback(() => {
    if (playlist.length === 0) return
    setRecentlyPlayed((prev) => {
      const current = playlist[currentIndex]?.title
      if (!current) return prev
      return [current, ...prev.filter((t) => t.id !== current.id)].slice(0, 8)
    })
    setCurrentIndex((i) => (i + 1 >= playlist.length ? 0 : i + 1))
    setShowNowPlaying(true)
    if (nowPlayingTimeoutRef.current) clearTimeout(nowPlayingTimeoutRef.current)
    nowPlayingTimeoutRef.current = setTimeout(() => setShowNowPlaying(false), 5000)
  }, [playlist, currentIndex])

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

  const seek = useCallback((seconds: number) => {
    const media = getMuxMedia(playerRef.current)
    if (!media) return
    const t = Math.max(0, Math.min(duration || 0, seconds))
    media.currentTime = t
    setCurrentTime(t)
  }, [duration])

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
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      el.requestFullscreen()
    }
  }, [])

  // Ensure we advance to next video when playback ends (native listener in case React onEnded doesn't fire)
  useEffect(() => {
    const el = playerRef.current
    if (!el || !playbackId) return
    const media = (el as any).media ?? el
    const onEnded = () => goToNext()
    media.addEventListener('ended', onEnded)
    return () => media.removeEventListener('ended', onEnded)
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
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!playbackId || !playerRef.current) return
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
      switch (e.key) {
        case ' ':
          e.preventDefault()
          if (isPlaying) playerRef.current.pause()
          else playerRef.current.play()
          break
        case 'ArrowLeft':
          e.preventDefault()
          seek(currentTime - 10)
          break
        case 'ArrowRight':
          e.preventDefault()
          seek(currentTime + 10)
          break
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [playbackId, isPlaying, currentTime, seek])

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!playerRef.current || duration <= 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const t = x * duration
    seek(t)
  }

  useEffect(() => {
    if (!showNowPlaying || !nowPlaying) return
    if (nowPlayingTimeoutRef.current) clearTimeout(nowPlayingTimeoutRef.current)
    nowPlayingTimeoutRef.current = setTimeout(() => setShowNowPlaying(false), 5000)
    return () => {
      if (nowPlayingTimeoutRef.current) clearTimeout(nowPlayingTimeoutRef.current)
    }
  }, [currentIndex, nowPlaying?.id])

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-gray-400">Loading Music Channel...</p>
      </div>
    )
  }

  if (showPreRoll && settings?.ad_playback_id) {
    return (
      <PreRollAd
        adUrl={settings.ad_playback_id}
        adDurationSeconds={settings.ad_duration_seconds ?? 15}
        sessionId={sessionId}
        onComplete={startPlaylist}
      />
    )
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Minimal header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-800/50">
        <Link href="/" className="text-lg font-semibold text-white hover:text-amber-400 transition">
          Warren Media Music
        </Link>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          {isLive && <span className="text-red-500 font-medium">Live</span>}
          <span>24/7</span>
        </div>
      </header>

      <MusicChannelEditorialSection />

      <AdSenseDisplay
        slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_MUSIC ?? ''}
        className="px-4 py-3 bg-black border-b border-gray-800/50"
        format="horizontal"
      />

      {/* Full-width player */}
      <div className="relative flex-1 w-full min-h-0 flex flex-col">
        {playlist.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <p>No videos in the playlist yet.</p>
          </div>
        ) : (
          <>
            <div ref={containerRef} className="relative w-full flex-1 min-h-0 flex flex-col bg-black">
              {/* Video area - no default controls */}
              <div className="relative flex-1 min-h-[40vh]">
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
                    style={{
                      '--controls': 'none',
                      '--media-object-fit': 'contain',
                    } as React.CSSProperties}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                    No playback ID for this video
                  </div>
                )}

                {/* Now Playing overlay (auto-fade) */}
                {nowPlaying && (
                  <div
                    className={`absolute top-4 left-4 right-4 md:right-auto md:max-w-md px-4 py-2 rounded bg-black/70 text-white text-sm transition-opacity duration-500 ${
                      showNowPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
                  >
                    <p className="font-medium">Now Playing: {nowPlaying.title}</p>
                    {nowPlaying.description && (
                      <p className="text-gray-400 text-xs mt-0.5 truncate">{nowPlaying.description}</p>
                    )}
                  </div>
                )}

                {/* Skip - top right */}
                {playlist.length > 1 && (
                  <button
                    onClick={goToNext}
                    className="absolute top-4 right-4 px-3 py-2 rounded bg-black/60 hover:bg-black/80 text-white text-sm font-medium transition z-10"
                  >
                    Skip →
                  </button>
                )}
              </div>

              {/* YouTube-style control bar: progress line then row of controls */}
              {playbackId && (
                <div className="flex-shrink-0 bg-gray-950 px-3 py-2">
                  {/* Progress bar */}
                  <div
                    role="progressbar"
                    className="h-1.5 bg-gray-700 rounded-full cursor-pointer group mb-2"
                    onClick={handleProgressClick}
                  >
                    <div
                      className="h-full bg-red-600 rounded-full transition-all duration-75"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>

                  {/* Controls row */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (playerRef.current) {
                          if (isPlaying) playerRef.current.pause()
                          else playerRef.current.play()
                        }
                      }}
                      className="p-1.5 rounded hover:bg-white/10 transition"
                      aria-label={isPlaying ? 'Pause' : 'Play'}
                    >
                      {isPlaying ? (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      )}
                    </button>
                    <span className="text-xs text-gray-400 tabular-nums">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                    {playlist.length > 1 && (
                      <button
                        onClick={goToNext}
                        className="p-1.5 rounded hover:bg-white/10 transition text-xs font-medium"
                      >
                        Skip
                      </button>
                    )}
                    <div className="flex-1" />
                    {/* Volume */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={toggleMute}
                        className="p-1.5 rounded hover:bg-white/10 transition"
                        aria-label={isMuted ? 'Unmute' : 'Mute'}
                      >
                        {isMuted || volume === 0 ? (
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                          </svg>
                        ) : volume < 0.5 ? (
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                          </svg>
                        )}
                      </button>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={isMuted ? 0 : volume}
                        onChange={(e) => setVolumeAndApply(parseFloat(e.target.value))}
                        className="w-20 h-1 accent-red-600 cursor-pointer"
                      />
                    </div>
                    <button
                      onClick={toggleFullscreen}
                      className="p-1.5 rounded hover:bg-white/10 transition"
                      aria-label="Fullscreen"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Below player: Recently Played + CTA */}
            <div className="px-6 py-6 space-y-6">
              {recentlyPlayed.length > 0 && (
                <section>
                  <h2 className="text-sm font-semibold text-gray-400 mb-3">Recently Played</h2>
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    {recentlyPlayed.map((t) => (
                      <div
                        key={t.id}
                        className="flex-shrink-0 w-32 text-center"
                        title={t.title}
                      >
                        <div className="aspect-video rounded bg-gray-800 overflow-hidden">
                          <img
                            src={t.poster_url}
                            alt={t.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <p className="text-xs text-gray-400 mt-1 truncate">{t.title}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}
              <div className="flex justify-center">
                <Link
                  href="/creator"
                  className="px-6 py-2 rounded border border-white/30 text-white/90 text-sm hover:bg-white/10 transition"
                >
                  Submit Your Video
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
