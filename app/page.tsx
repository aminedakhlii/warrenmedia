'use client'

import { useEffect, useState } from 'react'
import { supabase, type Title, type PlaybackProgress, getCurrentUser, Episode } from './lib/supabaseClient'
import RowSlider from './components/RowSlider'
import TheaterOverlay from './components/TheaterOverlay'
import Header from './components/Header'
import CommunitySection from './components/CommunitySection'
import SearchModal from './components/SearchModal'

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
  const [showSearch, setShowSearch] = useState(false)

  // Get current user and listen for auth changes
  useEffect(() => {
    getCurrentUser().then(setUser)

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Fetch all data when user changes
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
        .select('*')
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
        .select('*')
        .eq('category', 'originals')
        .order('created_at', { ascending: false })
        .limit(ITEMS_PER_ROW)

      if (originalsTitles) {
        setOriginals(originalsTitles)
      }

      // Fetch new releases
      const { data: newReleasesTitles } = await supabase
        .from('titles')
        .select('*')
        .eq('category', 'new_releases')
        .order('created_at', { ascending: false })
        .limit(ITEMS_PER_ROW)

      if (newReleasesTitles) {
        setNewReleases(newReleasesTitles)
      }

      // Fetch music videos
      const { data: musicVideosTitles } = await supabase
        .from('titles')
        .select('*')
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
        const { data: titleProgress, error: titleError } = await supabase
          .from('playback_progress')
          .select(`
            *,
            title:titles(*)
          `)
          .eq('user_id', user.id)
          .not('title_id', 'is', null)
          .gt('position_seconds', 2)
          .order('updated_at', { ascending: false })
          .limit(CONTINUE_WATCHING_LIMIT)

        if (titleError) {
          console.error('Error fetching title progress:', titleError)
        } else {
          console.log('Title progress:', titleProgress)
        }

        // Fetch progress for series episodes (need to get the series title)
        const { data: episodeProgress, error: episodeError } = await supabase
          .from('playback_progress')
          .select(`
            *,
            episode:episodes(
              *,
              season:seasons(
                *,
                series:titles(*)
              )
            )
          `)
          .eq('user_id', user.id)
          .not('episode_id', 'is', null)
          .gt('position_seconds', 2)
          .order('updated_at', { ascending: false })
          .limit(CONTINUE_WATCHING_LIMIT)

        if (episodeError) {
          console.error('Error fetching episode progress:', episodeError)
        } else {
          console.log('Episode progress:', episodeProgress)
        }

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
      <Header onSearchClick={() => setShowSearch(true)} />
      <main className="min-h-screen bg-black">
        {/* Hero Section - Two Column Layout (Desktop) / Full Screen (Mobile) */}
        {heroTitle && (
          <div className="relative flex flex-col md:flex-row pt-16 md:pl-7" style={{ height: '50vh' }}>
            {/* Left Side - Featured Content (mockup: faded poster, title + Watch Now bottom-left) */}
            <div 
              className="flex-1 relative cursor-pointer transition-transform hover:scale-[1.02]" 
              onClick={() => handleTitleClick(heroTitle)}
            >
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `url(${heroTitle.poster_url})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />
              {/* Slight fade/desaturation over full image (mockup look) */}
              <div className="absolute inset-0 bg-black/25" />
              {/* Gradient at bottom for title + button */}
              <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />
              
              {/* Title + Watch Now (mockup: THE ENIGMA style above button) */}
              <div className="absolute bottom-0 left-0 right-0 flex flex-col items-start justify-end p-6 md:p-12 gap-3 z-10">
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-[0.05em] uppercase text-white text-glow-strong whitespace-nowrap">
                  {heroTitle.title}
                </h1>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleTitleClick(heroTitle)
                  }}
                  className="text-white text-lg md:text-xl font-bold border-2 border-white border-glow text-glow px-5 md:px-8 py-1.5 hover:scale-105 transition-transform"
                >
                  WATCH NOW
                </button>
              </div>
            </div>

            {/* Right Side - Community (mockup: darker panel, illuminated text) */}
            <div className="hidden md:block w-[380px] flex-shrink-0 bg-black/50 backdrop-blur-sm p-6 overflow-hidden">
              <CommunitySection />
            </div>
          </div>
        )}

        {/* Content Rows - unified black background */}
        <div className="py-10 space-y-10 bg-black">
          {/* Trending Now (first) */}
          {trending.length > 0 && (
            <RowSlider title="Trending Now" titles={trending} onTitleClick={handleTitleClick} />
          )}

          {/* Continue Watching (only for logged-in users) */}
          {user && continueWatching.length > 0 && (
            <RowSlider
              title="Continue Watching"
              titles={continueWatching}
              onTitleClick={handleTitleClick}
            />
          )}

          {/* New Releases */}
          {newReleases.length > 0 && (
            <RowSlider title="New Releases" titles={newReleases} onTitleClick={handleTitleClick} />
          )}

          {/* Critically Acclaimed */}
          {originals.length > 0 && (
            <RowSlider title="Critically Acclaimed" titles={originals} onTitleClick={handleTitleClick} />
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

        {/* Search Modal */}
        {showSearch && (
          <SearchModal
            onClose={() => setShowSearch(false)}
            onSelectTitle={handleTitleClick}
          />
        )}
      </main>
    </>
  )
}
