'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import MuxPlayer from '@mux/mux-player-react'
import type { Title } from '../lib/supabaseClient'
import { supabase } from '../lib/supabaseClient'

interface TheaterOverlayProps {
  title: Title
  onClose: () => void
  initialPosition?: number
}

export default function TheaterOverlay({ title, onClose, initialPosition = 0 }: TheaterOverlayProps) {
  const playerRef = useRef<HTMLVideoElement>(null)
  const [showControls, setShowControls] = useState(true)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const hideControlsTimeoutRef = useRef<NodeJS.Timeout>()
  const lastSaveTimeRef = useRef(0)

  // Hide controls after inactivity
  const resetHideControlsTimer = useCallback(() => {
    setShowControls(true)
    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current)
    }
    hideControlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false)
    }, 1500)
  }, [])

  // Save progress to Supabase (throttled to ~10 seconds)
  const saveProgress = useCallback(
    async (position: number) => {
      const now = Date.now()
      if (now - lastSaveTimeRef.current < 10000) return // Throttle to 10 seconds

      // Don't save if at the very beginning or end
      if (position < 2 || (duration > 0 && position > duration - 5)) return

      lastSaveTimeRef.current = now

      try {
        const { data: existing } = await supabase
          .from('playback_progress')
          .select('id')
          .eq('title_id', title.id)
          .single()

        if (existing) {
          await supabase
            .from('playback_progress')
            .update({
              position_seconds: position,
              updated_at: new Date().toISOString(),
            })
            .eq('title_id', title.id)
        } else {
          await supabase.from('playback_progress').insert({
            title_id: title.id,
            position_seconds: position,
          })
        }
      } catch (error) {
        console.error('Error saving progress:', error)
      }
    },
    [title.id, duration]
  )

  // Handle time update
  const handleTimeUpdate = useCallback(() => {
    if (playerRef.current) {
      const time = playerRef.current.currentTime
      setCurrentTime(time)
      saveProgress(time)
    }
  }, [saveProgress])

  // Handle loaded metadata
  const handleLoadedMetadata = useCallback(() => {
    if (playerRef.current) {
      setDuration(playerRef.current.duration)
      
      // Resume from saved position
      if (initialPosition > 2 && initialPosition < playerRef.current.duration - 5) {
        playerRef.current.currentTime = initialPosition
      }
    }
  }, [initialPosition])

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!playerRef.current) return

      resetHideControlsTimer()

      switch (e.key) {
        case 'Escape':
          e.preventDefault()
          onClose()
          break
        case ' ':
        case 'k':
          e.preventDefault()
          if (isPlaying) {
            playerRef.current.pause()
          } else {
            playerRef.current.play()
          }
          break
        case 'ArrowLeft':
          e.preventDefault()
          playerRef.current.currentTime = Math.max(0, playerRef.current.currentTime - 10)
          break
        case 'ArrowRight':
          e.preventDefault()
          playerRef.current.currentTime = Math.min(
            playerRef.current.duration,
            playerRef.current.currentTime + 10
          )
          break
        case 'f':
          e.preventDefault()
          if (document.fullscreenElement) {
            document.exitFullscreen()
          } else {
            playerRef.current.requestFullscreen()
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, isPlaying, resetHideControlsTimer])

  // Mouse movement and touch
  useEffect(() => {
    const handleMouseMove = () => resetHideControlsTimer()
    const handleTouchStart = () => resetHideControlsTimer()

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('touchstart', handleTouchStart)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('touchstart', handleTouchStart)
    }
  }, [resetHideControlsTimer])

  // Prevent background scrolling
  useEffect(() => {
    document.body.classList.add('theater-active')
    return () => {
      document.body.classList.remove('theater-active')
    }
  }, [])

  // Cleanup timeout
  useEffect(() => {
    return () => {
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current)
      }
    }
  }, [])

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    }
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center">
      {/* Background dimmed page */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Video player */}
      <div className="relative w-full h-full flex items-center justify-center">
        <MuxPlayer
          ref={playerRef}
          playbackId={title.mux_playback_id}
          streamType="on-demand"
          autoPlay
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          className="w-full h-full"
          style={{
            '--controls': 'none',
            '--media-object-fit': 'contain',
          } as React.CSSProperties}
        />

        {/* Thin progress bar (always visible) */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-800">
          <div
            className="h-full bg-amber-glow transition-all duration-100"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        {/* Custom controls */}
        <div
          className={`
            absolute bottom-0 left-0 right-0 p-8 pt-32
            bg-gradient-to-t from-black/80 to-transparent
            transition-opacity duration-300
            ${showControls ? 'opacity-100' : 'opacity-0'}
          `}
        >
          <div className="flex items-center gap-4 mb-4">
            {/* Play/Pause */}
            <button
              onClick={() => {
                if (playerRef.current) {
                  if (isPlaying) {
                    playerRef.current.pause()
                  } else {
                    playerRef.current.play()
                  }
                }
              }}
              className="w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition"
            >
              {isPlaying ? (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* Time display */}
            <div className="text-sm">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Close button */}
            <button
              onClick={onClose}
              className="w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-semibold">{title.title}</h2>
        </div>
      </div>
    </div>
  )
}

