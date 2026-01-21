'use client'

import { useEffect, useRef, useState } from 'react'
import MuxPlayer from '@mux/mux-player-react'
import { logAdImpressionEvent } from '../lib/supabaseClient'

interface PreRollAdProps {
  adUrl: string
  adDurationSeconds: number
  titleId?: string
  episodeId?: string
  sessionId: string
  onComplete: () => void
}

export default function PreRollAd({
  adUrl,
  adDurationSeconds,
  titleId,
  episodeId,
  sessionId,
  onComplete,
}: PreRollAdProps) {
  const playerRef = useRef<any>(null)
  const [timeRemaining, setTimeRemaining] = useState(adDurationSeconds)
  const [adLogged, setAdLogged] = useState(false)
  const [error, setError] = useState(false)

  // Check if adUrl is a playback ID (no protocol) or full URL
  const isPlaybackId = adUrl && !adUrl.includes('://')

  useEffect(() => {
    // Log ad impression on mount (started)
    logAdImpressionEvent(adDurationSeconds, false, titleId, episodeId, sessionId)
    setAdLogged(true)
  }, [])

  useEffect(() => {
    // Auto-skip if error or if player doesn't load within 3 seconds
    const timeout = setTimeout(() => {
      if (!playerRef.current || error) {
        console.warn('Ad failed to load, skipping...')
        onComplete()
      }
    }, 3000)

    return () => clearTimeout(timeout)
  }, [error, onComplete])

  const handleTimeUpdate = () => {
    const player = playerRef.current
    if (player && player.currentTime && player.duration) {
      const remaining = Math.ceil(player.duration - player.currentTime)
      setTimeRemaining(remaining)
    }
  }

  const handleEnded = () => {
    // Log ad completion
    if (adLogged) {
      logAdImpressionEvent(adDurationSeconds, true, titleId, episodeId, sessionId)
    }
    onComplete()
  }

  const handleError = () => {
    console.error('Ad playback error')
    setError(true)
  }

  const handleLoadStart = () => {
    console.log('Ad loading...')
  }

  const handleCanPlay = () => {
    console.log('Ad ready to play')
    // Force play if not already playing
    if (playerRef.current && playerRef.current.paused) {
      playerRef.current.play().catch((err: Error) => {
        console.error('Autoplay failed:', err)
        setError(true)
      })
    }
  }

  if (error) {
    // Skip ad on error
    return null
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
      {/* Ad Player */}
      <div className="relative w-full h-full">
        <MuxPlayer
          ref={playerRef}
          playbackId={isPlaybackId ? adUrl : undefined}
          src={!isPlaybackId ? adUrl : undefined}
          streamType="on-demand"
          autoPlay="any"
          muted={false}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          onError={handleError}
          onLoadStart={handleLoadStart}
          onCanPlay={handleCanPlay}
          className="w-full h-full"
          style={{
            '--controls': 'none',
            '--media-object-fit': 'contain',
          } as React.CSSProperties}
        />

        {/* Minimal "Ad" indicator */}
        <div className="absolute top-4 left-4 px-3 py-1 bg-black/60 rounded text-xs text-gray-300">
          Ad · {timeRemaining}s
        </div>
      </div>
    </div>
  )
}

