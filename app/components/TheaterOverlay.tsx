'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import MuxPlayer from '@mux/mux-player-react'
import type { Title, Season, Episode, TitleAdConfig } from '../lib/supabaseClient'
import { 
  supabase, 
  getCurrentUser, 
  getFeatureFlag,
  logPlayEvent,
  logCompletionEvent
} from '../lib/supabaseClient'
import PreRollAd from './PreRollAd'
import CommentsSection from './CommentsSection'
import CreatorPosts from './CreatorPosts'

interface TheaterOverlayProps {
  title: Title
  onClose: () => void
  initialPosition?: number
  initialEpisode?: Episode
}

export default function TheaterOverlay({
  title,
  onClose,
  initialPosition = 0,
  initialEpisode,
}: TheaterOverlayProps) {
  const playerRef = useRef<any>(null)
  const [showControls, setShowControls] = useState(true)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const hideControlsTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const lastSaveTimeRef = useRef(0)

  // Series-specific state
  const [seasons, setSeasons] = useState<Season[]>([])
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(initialEpisode || null)
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null)
  const [showEpisodeSelector, setShowEpisodeSelector] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [showCreatorPosts, setShowCreatorPosts] = useState(false)

  const [user, setUser] = useState<any>(null)
  
  // Phase 3: Ads and tracking (behind feature flags)
  const [sessionId] = useState(() => crypto.randomUUID())
  const [showingAd, setShowingAd] = useState(false)
  const [adConfig, setAdConfig] = useState<TitleAdConfig | null>(null)
  const [adsEnabled, setAdsEnabled] = useState(false)
  const [trackingEnabled, setTrackingEnabled] = useState(false)
  const hasLoggedPlayRef = useRef(false)

  // Get current user and feature flags
  useEffect(() => {
    getCurrentUser().then(setUser)
    
    // Check feature flags
    getFeatureFlag('ads_system').then(setAdsEnabled)
    getFeatureFlag('event_tracking').then(setTrackingEnabled)
  }, [])

  // Load series data if content is a series
  useEffect(() => {
    if (title.content_type === 'series') {
      loadSeriesData()
    }
  }, [title])

  // Phase 3: Check for ads and log play event
  useEffect(() => {
    async function init() {
      // Check if ads are enabled for this title
      if (adsEnabled && title.content_type !== 'series') {
        const { data } = await supabase
          .from('title_ad_config')
          .select('*')
          .eq('title_id', title.id)
          .eq('ads_enabled', true)
          .single()
        
        if (data) {
          setAdConfig(data)
          setShowingAd(true)
        }
      }

      // Log play event (if tracking enabled and not already logged)
      if (trackingEnabled && !hasLoggedPlayRef.current) {
        hasLoggedPlayRef.current = true
        if (title.content_type === 'series' && currentEpisode) {
          await logPlayEvent(undefined, currentEpisode.id, sessionId)
        } else {
          await logPlayEvent(title.id, undefined, sessionId)
        }
      }
    }

    init()
  }, [adsEnabled, trackingEnabled, title, currentEpisode, sessionId])

  // Log completion event on unmount
  useEffect(() => {
    return () => {
      if (trackingEnabled && duration > 0 && currentTime > 0) {
        const watchPercentage = (currentTime / duration) * 100
        if (title.content_type === 'series' && currentEpisode) {
          logCompletionEvent(watchPercentage, undefined, currentEpisode.id, sessionId)
        } else {
          logCompletionEvent(watchPercentage, title.id, undefined, sessionId)
        }
      }
    }
  }, [trackingEnabled, currentTime, duration, title, currentEpisode, sessionId])

  const loadSeriesData = async () => {
    try {
      // Fetch seasons
      const { data: seasonsData } = await supabase
        .from('seasons')
        .select('*')
        .eq('series_id', title.id)
        .order('season_number', { ascending: true })

      if (seasonsData && seasonsData.length > 0) {
        setSeasons(seasonsData)
        setSelectedSeason(seasonsData[0])

        // Fetch episodes for first season
        const { data: episodesData } = await supabase
          .from('episodes')
          .select('*')
          .eq('season_id', seasonsData[0].id)
          .order('episode_number', { ascending: true })

        if (episodesData && episodesData.length > 0) {
          setEpisodes(episodesData)
          if (!currentEpisode) {
            setCurrentEpisode(episodesData[0])
          }
        }
      }
    } catch (error) {
      console.error('Error loading series data:', error)
    }
  }

  const loadEpisodesBySeason = async (season: Season) => {
    try {
      const { data: episodesData } = await supabase
        .from('episodes')
        .select('*')
        .eq('season_id', season.id)
        .order('episode_number', { ascending: true })

      if (episodesData) {
        setEpisodes(episodesData)
      }
    } catch (error) {
      console.error('Error loading episodes:', error)
    }
  }

  // Get playback ID based on content type
  const getPlaybackId = () => {
    if (title.content_type === 'series' && currentEpisode) {
      return currentEpisode.mux_playback_id
    }
    return title.mux_playback_id
  }

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
      // Only save if user is logged in
      if (!user) return

      const now = Date.now()
      if (now - lastSaveTimeRef.current < 10000) return // Throttle to 10 seconds

      // Don't save if at the very beginning or end
      if (position < 2 || (duration > 0 && position > duration - 5)) return

      lastSaveTimeRef.current = now

      try {
        const progressData: any = {
          user_id: user.id,
          position_seconds: position,
          updated_at: new Date().toISOString(),
        }

        if (title.content_type === 'series' && currentEpisode) {
          // Save progress for episode
          progressData.episode_id = currentEpisode.id
          progressData.title_id = null

          const { data: existing } = await supabase
            .from('playback_progress')
            .select('id')
            .eq('user_id', user.id)
            .eq('episode_id', currentEpisode.id)
            .maybeSingle()

          if (existing) {
            await supabase
              .from('playback_progress')
              .update(progressData)
              .eq('id', existing.id)
          } else {
            await supabase.from('playback_progress').insert(progressData)
          }
        } else {
          // Save progress for film/music video/podcast
          progressData.title_id = title.id
          progressData.episode_id = null

          const { data: existing } = await supabase
            .from('playback_progress')
            .select('id')
            .eq('user_id', user.id)
            .eq('title_id', title.id)
            .maybeSingle()

          if (existing) {
            await supabase
              .from('playback_progress')
              .update(progressData)
              .eq('id', existing.id)
          } else {
            await supabase.from('playback_progress').insert(progressData)
          }
        }
      } catch (error) {
        console.error('Error saving progress:', error)
      }
    },
    [user, title.id, title.content_type, currentEpisode, duration]
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

  // Switch episode
  const switchEpisode = (episode: Episode) => {
    setCurrentEpisode(episode)
    setShowEpisodeSelector(false)
    setCurrentTime(0)
    // Reset player with new episode
    if (playerRef.current) {
      playerRef.current.currentTime = 0
    }
  }

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!playerRef.current) return

      resetHideControlsTimer()

      switch (e.key) {
        case 'Escape':
          e.preventDefault()
          if (showEpisodeSelector) {
            setShowEpisodeSelector(false)
          } else {
            onClose()
          }
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
  }, [onClose, isPlaying, resetHideControlsTimer, showEpisodeSelector])

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
  const playbackId = getPlaybackId()
  const isPodcast = title.content_type === 'podcast'

  // Phase 3: Show pre-roll ad if enabled
  if (showingAd && adConfig?.ad_url) {
    return (
      <PreRollAd
        adUrl={adConfig.ad_url}
        adDurationSeconds={adConfig.ad_duration_seconds}
        titleId={title.content_type === 'series' ? undefined : title.id}
        episodeId={currentEpisode?.id}
        sessionId={sessionId}
        onComplete={() => {
          setShowingAd(false)
          // Trigger play after ad completes
          setTimeout(() => {
            if (playerRef.current && playerRef.current.play) {
              playerRef.current.play().catch(() => {
                // Autoplay might be blocked, user will need to click play
              })
            }
          }, 100)
        }}
      />
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center">
      {/* Background dimmed page */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Video/Audio player */}
      <div className="relative w-full h-full flex items-center justify-center">
        {playbackId && (
          <>
            {isPodcast && (
              // Static artwork overlay for podcasts
              <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none">
                {/* Blurred background */}
                <div
                  className="absolute inset-0 bg-cover bg-center blur-xl opacity-30"
                  style={{ backgroundImage: `url(${title.poster_url})` }}
                />
                {/* Poster artwork */}
                <div className="relative z-10 flex flex-col items-center">
                  <img
                    src={title.poster_url}
                    alt={title.title}
                    className="w-96 h-96 object-cover rounded-lg shadow-2xl"
                  />
                </div>
              </div>
            )}
            
            {/* Mux Player for both video and audio */}
            <MuxPlayer
              key={playbackId} // Force re-render on episode change
              ref={playerRef}
              playbackId={playbackId}
              streamType="on-demand"
              autoPlay
              audio={isPodcast} // Audio-only mode for podcasts
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              className={isPodcast ? 'hidden' : 'w-full h-full'}
              style={{
                '--controls': 'none',
                '--media-object-fit': 'contain',
              } as React.CSSProperties}
            />
          </>
        )}

        {/* Thin progress bar (always visible) */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-800 z-30">
          <div
            className="h-full bg-amber-glow transition-all duration-100"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        {/* Episode Selector (for series) */}
        {showEpisodeSelector && title.content_type === 'series' && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80">
            <div className="bg-gray-900 rounded-lg p-8 max-w-4xl w-full mx-8 max-h-[80vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-6">Episodes</h2>

              {/* Season selector */}
              <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {seasons.map((season) => (
                  <button
                    key={season.id}
                    onClick={() => {
                      setSelectedSeason(season)
                      loadEpisodesBySeason(season)
                    }}
                    className={`
                      px-4 py-2 rounded-lg whitespace-nowrap transition
                      ${
                        selectedSeason?.id === season.id
                          ? 'bg-amber-glow text-black'
                          : 'bg-gray-800 hover:bg-gray-700'
                      }
                    `}
                  >
                    {season.title}
                  </button>
                ))}
              </div>

              {/* Episode list */}
              <div className="space-y-2">
                {episodes.map((episode) => (
                  <button
                    key={episode.id}
                    onClick={() => switchEpisode(episode)}
                    className={`
                      w-full p-4 rounded-lg text-left transition
                      ${
                        currentEpisode?.id === episode.id
                          ? 'bg-amber-glow/20 border-2 border-amber-glow'
                          : 'bg-gray-800 hover:bg-gray-700'
                      }
                    `}
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-2xl font-bold text-gray-400">
                        {episode.episode_number}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{episode.title}</h3>
                        {episode.description && (
                          <p className="text-sm text-gray-400 line-clamp-2">
                            {episode.description}
                          </p>
                        )}
                      </div>
                      <div className="text-sm text-gray-400">
                        {formatTime(episode.runtime_seconds)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <button
                onClick={() => setShowEpisodeSelector(false)}
                className="mt-6 w-full px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Custom controls */}
        <div
          className={`
            absolute bottom-0 left-0 right-0 p-4 sm:p-8 pt-20 sm:pt-32 z-10
            bg-gradient-to-t from-black/80 to-transparent
            transition-opacity duration-300
            ${showControls ? 'opacity-100' : 'opacity-0'}
          `}
        >
          <div className="flex items-center gap-2 sm:gap-4 mb-2 sm:mb-4 flex-wrap">
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
            <div className="text-xs sm:text-sm">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>

            {/* Episode selector button (for series) */}
            {title.content_type === 'series' && (
              <button
                onClick={() => setShowEpisodeSelector(true)}
                className="px-2 sm:px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition text-xs sm:text-sm"
              >
                <span className="hidden sm:inline">Episodes</span>
                <span className="sm:hidden">Eps</span>
              </button>
            )}

            {/* Comments toggle button */}
            <button
              onClick={() => {
                setShowComments(!showComments)
                if (!showComments) setShowCreatorPosts(false)
              }}
              className={`px-2 sm:px-4 py-2 rounded-lg transition text-xs sm:text-sm whitespace-nowrap ${
                showComments
                  ? 'bg-amber-glow/20 text-amber-400'
                  : 'bg-white/10 hover:bg-white/20'
              }`}
            >
              <span className="hidden sm:inline">💬 Comments</span>
              <span className="sm:hidden">💬</span>
            </button>

            {/* Creator Posts toggle button */}
            <button
              onClick={() => {
                setShowCreatorPosts(!showCreatorPosts)
                if (!showCreatorPosts) setShowComments(false)
              }}
              className={`px-2 sm:px-4 py-2 rounded-lg transition text-xs sm:text-sm whitespace-nowrap ${
                showCreatorPosts
                  ? 'bg-amber-glow/20 text-amber-400'
                  : 'bg-white/10 hover:bg-white/20'
              }`}
            >
              <span className="hidden sm:inline">📢 Creator Updates</span>
              <span className="sm:hidden">📢</span>
            </button>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Auth notice for guests */}
            {!user && (
              <div className="hidden md:block text-sm text-gray-400">
                Sign in to save progress
              </div>
            )}

            {/* Close button */}
            <button
              onClick={onClose}
              className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-red-600/80 hover:bg-red-600 transition ml-2"
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

          {/* Title and episode info */}
          <div>
            <h2 className="text-2xl font-semibold">{title.title}</h2>
            {currentEpisode && (
              <p className="text-sm text-gray-400 mt-1">
                S{selectedSeason?.season_number} E{currentEpisode.episode_number}: {currentEpisode.title}
              </p>
            )}
          </div>
        </div>

        {/* Comments Panel (non-intrusive, below video) */}
        {showComments && (
          <div className="absolute bottom-0 left-0 right-0 max-h-[50vh] overflow-y-auto z-40 bg-black/95 backdrop-blur-sm">
            <CommentsSection
              titleId={title.id}
              episodeId={currentEpisode?.id}
              isVisible={showComments}
              onClose={() => setShowComments(false)}
            />
          </div>
        )}

        {/* Creator Posts Panel (non-intrusive, below video) */}
        {showCreatorPosts && (
          <div className="absolute bottom-0 left-0 right-0 max-h-[50vh] overflow-y-auto z-40 bg-black/95 backdrop-blur-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Creator Updates</h2>
              <button
                onClick={() => setShowCreatorPosts(false)}
                className="text-2xl hover:text-amber-glow transition"
              >
                ✕
              </button>
            </div>
            <CreatorPosts titleId={title.id} readonly={true} />
          </div>
        )}
      </div>
    </div>
  )
}
