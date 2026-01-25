'use client'

import { useEffect, useState } from 'react'
import { supabase, type Title, type PlaybackProgress, getCurrentUser, Episode } from './lib/supabaseClient'
import RowSlider from './components/RowSlider'
import TheaterOverlay from './components/TheaterOverlay'
import Header from './components/Header'

export default function HomePage() {
  const [heroTitle, setHeroTitle] = useState<Title | null>(null)
  const [continueWatching, setContinueWatching] = useState<Title[]>([])
  const [trending, setTrending] = useState<Title[]>([])
  const [originals, setOriginals] = useState<Title[]>([])
  const [newReleases, setNewReleases] = useState<Title[]>([])
  const [musicVideos, setMusicVideos] = useState<Title[]>([])
  const [selectedTitle, setSelectedTitle] = useState<Title | null>(null)
  const [resumePosition, setResumePosition] = useState(0)
  const [resumeEpisode, setResumeEpisode] = useState<Episode | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  // Get current user
  useEffect(() => {
    getCurrentUser().then(setUser)
  }, [])

  // Fetch all data
  useEffect(() => {
    fetchData()
  }, [user])

  async function fetchData() {
    try {
      // Phase 5: Optimized queries with limits and only necessary fields
      const ITEMS_PER_ROW = 20 // Limit items per category for performance
      
      // Fetch trending titles (for hero and trending row)
      const { data: trendingTitles } = await supabase
        .from('titles')
        .select('id, title, poster_url, backdrop_url, description, category, content_type, mux_playback_id, creator_id')
        .eq('category', 'trending')
        .order('created_at', { ascending: false })
        .limit(ITEMS_PER_ROW)

      if (trendingTitles && trendingTitles.length > 0) {
        setHeroTitle(trendingTitles[0])
        setTrending(trendingTitles)
      }

      // Fetch originals
      const { data: originalsTitles } = await supabase
        .from('titles')
        .select('id, title, poster_url, backdrop_url, description, category, content_type, mux_playback_id, creator_id')
        .eq('category', 'originals')
        .order('created_at', { ascending: false })
        .limit(ITEMS_PER_ROW)

      if (originalsTitles) {
        setOriginals(originalsTitles)
      }

      // Fetch new releases
      const { data: newReleasesTitles } = await supabase
        .from('titles')
        .select('id, title, poster_url, backdrop_url, description, category, content_type, mux_playback_id, creator_id')
        .eq('category', 'new_releases')
        .order('created_at', { ascending: false })
        .limit(ITEMS_PER_ROW)

      if (newReleasesTitles) {
        setNewReleases(newReleasesTitles)
      }

      // Fetch music videos
      const { data: musicVideosTitles } = await supabase
        .from('titles')
        .select('id, title, poster_url, backdrop_url, description, category, content_type, mux_playback_id, creator_id')
        .eq('category', 'music_videos')
        .order('created_at', { ascending: false })
        .limit(ITEMS_PER_ROW)

      if (musicVideosTitles) {
        setMusicVideos(musicVideosTitles)
      }

      // Fetch continue watching (only for logged-in users)
      if (user) {
        // Phase 5: Limit continue watching to 20 most recent items
        const CONTINUE_WATCHING_LIMIT = 20

        // Fetch progress for regular titles (films, music videos, podcasts)
        const { data: titleProgress } = await supabase
          .from('playback_progress')
          .select(`
            position_seconds,
            duration_seconds,
            updated_at,
            title:titles(id, title, poster_url, backdrop_url, description, category, content_type, mux_playback_id, creator_id)
          `)
          .eq('user_id', user.id)
          .not('title_id', 'is', null)
          .gt('position_seconds', 2)
          .order('updated_at', { ascending: false })
          .limit(CONTINUE_WATCHING_LIMIT)

        // Fetch progress for series episodes (need to get the series title)
        const { data: episodeProgress } = await supabase
          .from('playback_progress')
          .select(`
            position_seconds,
            duration_seconds,
            updated_at,
            episode:episodes(
              id,
              title,
              episode_number,
              season:seasons(
                id,
                season_number,
                series:titles(id, title, poster_url, backdrop_url, description, category, content_type, mux_playback_id, creator_id)
              )
            )
          `)
          .eq('user_id', user.id)
          .not('episode_id', 'is', null)
          .gt('position_seconds', 2)
          .order('updated_at', { ascending: false })
          .limit(CONTINUE_WATCHING_LIMIT)

        // Combine and deduplicate titles
        const titlesMap = new Map<string, Title>()
        
        // Add regular titles
        titleProgress?.forEach((p: any) => {
          if (p.title) {
            titlesMap.set(p.title.id, p.title)
          }
        })

        // Add series titles (from episodes)
        episodeProgress?.forEach((p: any) => {
          if (p.episode?.season?.series) {
            const series = p.episode.season.series
            titlesMap.set(series.id, series)
          }
        })

        setContinueWatching(Array.from(titlesMap.values()).slice(0, 20))
      } else {
        setContinueWatching([])
      }

      setLoading(false)
    } catch (error) {
      console.error('Error fetching data:', error)
      setLoading(false)
    }
  }

  const handleTitleClick = async (title: Title) => {
    // Check if there's saved progress (only for logged-in users)
    if (user) {
      try {
        if (title.content_type === 'series') {
          // For series, find the last watched episode
          const { data } = await supabase
            .from('playback_progress')
            .select(`
              *,
              episode:episodes(*)
            `)
            .eq('user_id', user.id)
            .not('episode_id', 'is', null)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          if (data && data.episode && data.position_seconds > 2) {
            setResumePosition(data.position_seconds)
            setResumeEpisode(data.episode as Episode)
          } else {
            setResumePosition(0)
            setResumeEpisode(null)
          }
        } else {
          // For films, music videos, podcasts
          const { data } = await supabase
            .from('playback_progress')
            .select('position_seconds')
            .eq('user_id', user.id)
            .eq('title_id', title.id)
            .maybeSingle()

          if (data && data.position_seconds > 2) {
            setResumePosition(data.position_seconds)
          } else {
            setResumePosition(0)
          }
          setResumeEpisode(null)
        }
      } catch {
        setResumePosition(0)
        setResumeEpisode(null)
      }
    } else {
      // Guest user - no resume
      setResumePosition(0)
      setResumeEpisode(null)
    }

    setSelectedTitle(title)
  }

  const handleCloseTheater = () => {
    setSelectedTitle(null)
    setResumePosition(0)
    setResumeEpisode(null)
    // Refresh continue watching
    if (user) {
      fetchData()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <>
      <Header />
      <main className="min-h-screen">
        {/* Hero Section */}
        {heroTitle && (
          <div
            className="relative h-screen flex items-center justify-start px-8"
            style={{
              backgroundImage: `url(${heroTitle.poster_url})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />

            {/* Content */}
            <div className="relative z-10 max-w-2xl">
              <h1 className="text-6xl font-bold mb-6">{heroTitle.title}</h1>
              {heroTitle.description && (
                <p className="text-lg text-gray-300 mb-8 line-clamp-3">
                  {heroTitle.description}
                </p>
              )}
              <button
                onClick={() => handleTitleClick(heroTitle)}
                className="
                  px-12 py-4 text-xl font-semibold rounded-lg
                  bg-amber-glow hover:bg-amber-600
                  glow-amber transition-all duration-300
                  hover:scale-105
                "
              >
                Play
              </button>
            </div>
          </div>
        )}

        {/* Content Rows */}
        <div className="py-12 space-y-8">
          {/* Continue Watching (only for logged-in users) */}
          {user && continueWatching.length > 0 && (
            <RowSlider
              title="Continue Watching"
              titles={continueWatching}
              onTitleClick={handleTitleClick}
            />
          )}

          {/* Trending */}
          {trending.length > 0 && (
            <RowSlider title="Trending" titles={trending} onTitleClick={handleTitleClick} />
          )}

          {/* Originals */}
          {originals.length > 0 && (
            <RowSlider title="Originals" titles={originals} onTitleClick={handleTitleClick} />
          )}

          {/* New Releases */}
          {newReleases.length > 0 && (
            <RowSlider title="New Releases" titles={newReleases} onTitleClick={handleTitleClick} />
          )}

          {/* Music Videos */}
          {musicVideos.length > 0 && (
            <RowSlider title="Music Videos" titles={musicVideos} onTitleClick={handleTitleClick} />
          )}
        </div>

        {/* Theater Overlay */}
        {selectedTitle && (
          <TheaterOverlay
            title={selectedTitle}
            onClose={handleCloseTheater}
            initialPosition={resumePosition}
            initialEpisode={resumeEpisode || undefined}
          />
        )}
      </main>
    </>
  )
}
