'use client'

import { useEffect, useState } from 'react'
import { supabase, type Title, type PlaybackProgress } from './lib/supabaseClient'
import RowSlider from './components/RowSlider'
import TheaterOverlay from './components/TheaterOverlay'

export default function HomePage() {
  const [heroTitle, setHeroTitle] = useState<Title | null>(null)
  const [continueWatching, setContinueWatching] = useState<PlaybackProgress[]>([])
  const [trending, setTrending] = useState<Title[]>([])
  const [originals, setOriginals] = useState<Title[]>([])
  const [newReleases, setNewReleases] = useState<Title[]>([])
  const [selectedTitle, setSelectedTitle] = useState<Title | null>(null)
  const [resumePosition, setResumePosition] = useState(0)
  const [loading, setLoading] = useState(true)

  // Fetch all data
  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch all titles
        const { data: allTitles } = await supabase
          .from('titles')
          .select('*')
          .order('created_at', { ascending: false })

        if (allTitles && allTitles.length > 0) {
          // Set hero to first trending title
          const trendingTitles = allTitles.filter((t) => t.category === 'trending')
          if (trendingTitles.length > 0) {
            setHeroTitle(trendingTitles[0])
          }

          // Set category rows
          setTrending(trendingTitles)
          setOriginals(allTitles.filter((t) => t.category === 'originals'))
          setNewReleases(allTitles.filter((t) => t.category === 'new_releases'))
        }

        // Fetch continue watching
        const { data: progressData } = await supabase
          .from('playback_progress')
          .select(`
            *,
            title:titles(*)
          `)
          .order('updated_at', { ascending: false })

        if (progressData) {
          setContinueWatching(
            progressData.filter((p) => p.title && p.position_seconds > 2) as PlaybackProgress[]
          )
        }

        setLoading(false)
      } catch (error) {
        console.error('Error fetching data:', error)
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleTitleClick = async (title: Title) => {
    // Check if there's saved progress
    try {
      const { data } = await supabase
        .from('playback_progress')
        .select('position_seconds')
        .eq('title_id', title.id)
        .single()

      if (data && data.position_seconds > 2) {
        setResumePosition(data.position_seconds)
      } else {
        setResumePosition(0)
      }
    } catch {
      setResumePosition(0)
    }

    setSelectedTitle(title)
  }

  const handleCloseTheater = () => {
    setSelectedTitle(null)
    setResumePosition(0)
    // Refresh continue watching
    supabase
      .from('playback_progress')
      .select(`
        *,
        title:titles(*)
      `)
      .order('updated_at', { ascending: false })
      .then(({ data }) => {
        if (data) {
          setContinueWatching(
            data.filter((p) => p.title && p.position_seconds > 2) as PlaybackProgress[]
          )
        }
      })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  return (
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
        {/* Continue Watching */}
        {continueWatching.length > 0 && (
          <RowSlider
            title="Continue Watching"
            titles={continueWatching.map((p) => p.title!)}
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
      </div>

      {/* Theater Overlay */}
      {selectedTitle && (
        <TheaterOverlay
          title={selectedTitle}
          onClose={handleCloseTheater}
          initialPosition={resumePosition}
        />
      )}
    </main>
  )
}

