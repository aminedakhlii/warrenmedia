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
  const playerRef = useRef<HTMLVideoElement>(null)
  const [timeRemaining, setTimeRemaining] = useState(adDurationSeconds)
  const [adLogged, setAdLogged] = useState(false)

  useEffect(() => {
    // Log ad impression on mount (started)
    logAdImpressionEvent(adDurationSeconds, false, titleId, episodeId, sessionId)
    setAdLogged(true)
  }, [])

  const handleTimeUpdate = () => {
    if (playerRef.current) {
      const remaining = Math.ceil(playerRef.current.duration - playerRef.current.currentTime)
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

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
      {/* Ad Player */}
      <div className="relative w-full h-full">
        <MuxPlayer
          ref={playerRef}
          src={adUrl}
          streamType="on-demand"
          autoPlay
          muted={false}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
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

