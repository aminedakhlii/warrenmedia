'use client'

import { useEffect, useRef, useState } from 'react'
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
  const nowPlayingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  const nowPlaying = playlist[currentIndex]?.title ?? null
  const playbackId = nowPlaying?.mux_playback_id ?? null
  const loopEnabled = settings?.loop_enabled ?? true
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

  const goToNext = () => {
    if (playlist.length === 0) return
    const current = playlist[currentIndex]?.title
    if (current) {
      setRecentlyPlayed((prev) => {
        const next = [current, ...prev.filter((t) => t.id !== current.id)].slice(0, 8)
        return next
      })
    }
    setCurrentIndex((i) => (i + 1 >= playlist.length ? (loopEnabled ? 0 : i) : i + 1))
    setShowNowPlaying(true)
    if (nowPlayingTimeoutRef.current) clearTimeout(nowPlayingTimeoutRef.current)
    nowPlayingTimeoutRef.current = setTimeout(() => setShowNowPlaying(false), 5000)
  }

  const handleEnded = () => {
    goToNext()
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

      {/* Full-width player */}
      <div className="relative flex-1 w-full min-h-0 flex flex-col">
        {playlist.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <p>No videos in the playlist yet.</p>
          </div>
        ) : (
          <>
            <div className="relative w-full flex-1 min-h-[50vh] bg-black">
              {playbackId ? (
                <MuxPlayer
                  ref={playerRef}
                  key={nowPlaying?.id}
                  playbackId={playbackId}
                  streamType="on-demand"
                  autoPlay="any"
                  onEnded={handleEnded}
                  className="w-full h-full"
                  style={{
                    '--controls': 'auto',
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
                  className={`absolute bottom-4 left-4 right-4 md:right-auto md:max-w-md px-4 py-2 rounded bg-black/70 text-white text-sm transition-opacity duration-500 ${
                    showNowPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
                  }`}
                >
                  <p className="font-medium">Now Playing: {nowPlaying.title}</p>
                  {nowPlaying.description && (
                    <p className="text-gray-400 text-xs mt-0.5 truncate">{nowPlaying.description}</p>
                  )}
                </div>
              )}

              {/* Skip button */}
              {playlist.length > 1 && (
                <button
                  onClick={goToNext}
                  className="absolute top-4 right-4 px-3 py-2 rounded bg-black/60 hover:bg-black/80 text-white text-sm font-medium transition"
                >
                  Skip →
                </button>
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
