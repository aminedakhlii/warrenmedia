'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { supabase, type Title, type Season, type Episode, ContentType } from '../../lib/supabaseClient'
import AdminGuard from '../../components/AdminGuard'

function AdminTitlesContent() {
  const [titles, setTitles] = useState<Title[]>([])
  const [contentType, setContentType] = useState<ContentType>('film')
  const [uploadMode, setUploadMode] = useState<'upload' | 'playback_id'>('upload')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [formData, setFormData] = useState({
    title: '',
    poster_url: '',
    mux_playback_id: '',
    category: 'trending' as 'trending' | 'originals' | 'new_releases' | 'music_videos',
    runtime_seconds: 0,
    description: '',
  })

  // Series management
  const [selectedSeries, setSelectedSeries] = useState<string | null>(null)
  const [seasons, setSeasons] = useState<Season[]>([])
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [seasonForm, setSeasonForm] = useState({
    season_number: 1,
    title: '',
  })
  const [episodeForm, setEpisodeForm] = useState({
    season_id: '',
    episode_number: 1,
    title: '',
    mux_playback_id: '',
    runtime_seconds: 0,
    description: '',
  })

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [activeTab, setActiveTab] = useState<'titles' | 'series'>('titles')

  useEffect(() => {
    fetchTitles()
  }, [])

  async function fetchTitles() {
    const { data } = await supabase
      .from('titles')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) {
      setTitles(data)
    }
  }

  async function fetchSeriesData(seriesId: string) {
    const { data: seasonsData } = await supabase
      .from('seasons')
      .select('*')
      .eq('series_id', seriesId)
      .order('season_number', { ascending: true })

    if (seasonsData) {
      setSeasons(seasonsData)
    }
  }

  async function fetchEpisodes(seasonId: string) {
    const { data: episodesData } = await supabase
      .from('episodes')
      .select('*')
      .eq('season_id', seasonId)
      .order('episode_number', { ascending: true })

    if (episodesData) {
      setEpisodes(episodesData)
    }
  }

  // Poll for playback ID from Mux
  async function pollForPlaybackId(uploadId: string, titleId: string, attempts = 0): Promise<void> {
    if (attempts > 20) {
      console.log('Max polling attempts reached for', uploadId)
      return
    }

    try {
      const response = await fetch(`/api/mux-status?uploadId=${uploadId}`)
      const data = await response.json()

      if (data.playbackId && data.ready) {
        // Update the title with the playback ID
        await supabase
          .from('titles')
          .update({
            mux_playback_id: data.playbackId,
            runtime_seconds: Math.floor(data.duration || 0),
          })
          .eq('id', titleId)

        console.log('Video ready:', data.playbackId)
        fetchTitles() // Refresh list
      } else {
        // Poll again in 5 seconds
        setTimeout(() => pollForPlaybackId(uploadId, titleId, attempts + 1), 5000)
      }
    } catch (error) {
      console.error('Error polling Mux status:', error)
      // Retry
      setTimeout(() => pollForPlaybackId(uploadId, titleId, attempts + 1), 5000)
    }
  }

  async function handleVideoUpload(file: File) {
    if (!formData.title) {
      setMessage('Please enter a title first')
      return
    }

    setUploading(true)
    setMessage('Creating upload...')
    setUploadProgress(0)

    try {
      // Create Mux direct upload URL
      const response = await fetch('/api/mux-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metadata: {
            title: formData.title,
            description: formData.description,
          },
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create upload')
      }

      setMessage('Uploading video...')

      // Upload to Mux with progress tracking
      const xhr = new XMLHttpRequest()
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 100)
          setUploadProgress(percentComplete)
        }
      })

      await new Promise((resolve, reject) => {
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(xhr.response)
          } else {
            reject(new Error('Upload failed'))
          }
        })
        xhr.addEventListener('error', () => reject(new Error('Upload failed')))
        
        xhr.open('PUT', data.uploadUrl)
        xhr.setRequestHeader('Content-Type', file.type)
        xhr.send(file)
      })

      setUploadProgress(100)
      setMessage('Processing video...')

      // Save to database
      const titleData: any = {
        ...formData,
        content_type: contentType,
        mux_playback_id: null, // Will be updated when processing completes
        poster_url: formData.poster_url || 'https://via.placeholder.com/240x360?text=Processing',
      }

      const { data: titleDbData, error } = await supabase
        .from('titles')
        .insert([titleData])
        .select()
        .single()

      if (error) throw error

      // Track the upload for status checking
      await supabase.from('mux_uploads').insert({
        mux_upload_id: data.uploadId,
        status: 'asset_created',
        title_metadata: { title_id: titleDbData.id },
      })

      // Poll for playback ID
      pollForPlaybackId(data.uploadId, titleDbData.id)

      setMessage('✅ Video uploaded! Processing in background...')
      setFormData({
        title: '',
        poster_url: '',
        mux_playback_id: '',
        category: 'trending',
        runtime_seconds: 0,
        description: '',
      })
      setUploading(false)
      setUploadProgress(0)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      await fetchTitles()
    } catch (error) {
      console.error('Upload error:', error)
      setMessage(`❌ Error: ${(error as Error).message}`)
      setUploading(false)
      setUploadProgress(0)
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      await handleVideoUpload(file)
    }
  }

  const handleSubmitTitle = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // If in upload mode, prompt user to upload file
    if (uploadMode === 'upload' && contentType !== 'series') {
      setMessage('⚠️ Please upload a video file using the upload box above')
      return
    }
    
    setLoading(true)
    setMessage('')

    try {
      const titleData: any = {
        ...formData,
        content_type: contentType,
      }

      // Series don't need mux_playback_id at title level
      if (contentType === 'series') {
        titleData.mux_playback_id = null
      }

      const { error } = await supabase.from('titles').insert([titleData])

      if (error) throw error

      setMessage('✅ Title added successfully!')
      setFormData({
        title: '',
        poster_url: '',
        mux_playback_id: '',
        category: 'trending',
        runtime_seconds: 0,
        description: '',
      })
      fetchTitles()
    } catch (error) {
      setMessage('❌ Error adding title: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleAddSeason = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSeries) return

    setLoading(true)
    setMessage('')

    try {
      const { error } = await supabase.from('seasons').insert([{
        series_id: selectedSeries,
        ...seasonForm,
      }])

      if (error) throw error

      setMessage('Season added successfully!')
      setSeasonForm({ season_number: 1, title: '' })
      fetchSeriesData(selectedSeries)
    } catch (error) {
      setMessage('Error adding season: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleAddEpisode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!episodeForm.season_id) return

    setLoading(true)
    setMessage('')

    try {
      const { error } = await supabase.from('episodes').insert([episodeForm])

      if (error) throw error

      setMessage('Episode added successfully!')
      setEpisodeForm({
        season_id: episodeForm.season_id,
        episode_number: 1,
        title: '',
        mux_playback_id: '',
        runtime_seconds: 0,
        description: '',
      })
      fetchEpisodes(episodeForm.season_id)
    } catch (error) {
      setMessage('Error adding episode: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteTitle = async (id: string) => {
    if (!confirm('Are you sure? This will delete all related seasons and episodes.')) return

    try {
      const { error } = await supabase.from('titles').delete().eq('id', id)

      if (error) throw error

      setMessage('Title deleted successfully!')
      fetchTitles()
    } catch (error) {
      setMessage('Error deleting title: ' + (error as Error).message)
    }
  }

  const seriesTitles = titles.filter(t => t.content_type === 'series')

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Admin: Manage Content</h1>

        {/* Tabs */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setActiveTab('titles')}
            className={`px-6 py-3 rounded-lg font-semibold transition ${
              activeTab === 'titles'
                ? 'bg-amber-glow text-black'
                : 'bg-gray-800 hover:bg-gray-700'
            }`}
          >
            Add Titles
          </button>
          <button
            onClick={() => setActiveTab('series')}
            className={`px-6 py-3 rounded-lg font-semibold transition ${
              activeTab === 'series'
                ? 'bg-amber-glow text-black'
                : 'bg-gray-800 hover:bg-gray-700'
            }`}
          >
            Manage Series
          </button>
        </div>

        {/* Add Title Form */}
        {activeTab === 'titles' && (
          <div className="bg-gray-900 rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-semibold mb-4">Add New Title</h2>
            <form onSubmit={handleSubmitTitle} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Content Type</label>
                <select
                  value={contentType}
                  onChange={(e) => setContentType(e.target.value as ContentType)}
                  className="w-full px-4 py-2 bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-glow"
                >
                  <option value="film">Film</option>
                  <option value="series">Series</option>
                  <option value="music_video">Music Video</option>
                  <option value="podcast">Podcast</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-glow"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Poster Image URL</label>
                <input
                  type="url"
                  value={formData.poster_url}
                  onChange={(e) => setFormData({ ...formData, poster_url: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-glow"
                  placeholder="https://example.com/poster.jpg"
                  required
                />
              </div>

              {contentType !== 'series' && (
                <div>
                  <div className="flex items-center gap-4 mb-2">
                    <label className="block text-sm font-medium">
                      Video Source {contentType === 'podcast' && '(Audio)'}
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setUploadMode('upload')}
                        className={`px-3 py-1 text-xs rounded ${
                          uploadMode === 'upload'
                            ? 'bg-amber-glow text-black'
                            : 'bg-gray-700 hover:bg-gray-600'
                        }`}
                      >
                        Upload File
                      </button>
                      <button
                        type="button"
                        onClick={() => setUploadMode('playback_id')}
                        className={`px-3 py-1 text-xs rounded ${
                          uploadMode === 'playback_id'
                            ? 'bg-amber-glow text-black'
                            : 'bg-gray-700 hover:bg-gray-600'
                        }`}
                      >
                        Enter Playback ID
                      </button>
                    </div>
                  </div>

                  {uploadMode === 'playback_id' ? (
                    <input
                      type="text"
                      value={formData.mux_playback_id}
                      onChange={(e) => setFormData({ ...formData, mux_playback_id: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-glow"
                      placeholder="abc123xyz..."
                      required={contentType !== 'series'}
                    />
                  ) : (
                    <div className="border-2 border-dashed border-gray-700 rounded-lg p-6 text-center">
                      {uploading ? (
                        <div>
                          <div className="mb-2 text-amber-400">Uploading... {uploadProgress}%</div>
                          <div className="w-full bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-amber-glow h-2 rounded-full transition-all"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                          <p className="text-xs text-gray-400 mt-2">{message}</p>
                        </div>
                      ) : (
                        <>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="video/*,audio/*"
                            onChange={handleFileSelect}
                            className="hidden"
                            id="admin-file-input"
                          />
                          <label
                            htmlFor="admin-file-input"
                            className="cursor-pointer inline-block px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
                          >
                            📁 Choose {contentType === 'podcast' ? 'Audio' : 'Video'} File
                          </label>
                          <p className="text-xs text-gray-500 mt-2">
                            File will be uploaded to Mux and processed automatically
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      category: e.target.value as typeof formData.category,
                    })
                  }
                  className="w-full px-4 py-2 bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-glow"
                >
                  <option value="trending">Trending</option>
                  <option value="originals">Originals</option>
                  <option value="new_releases">New Releases</option>
                  <option value="music_videos">Music Videos</option>
                </select>
              </div>

              {contentType !== 'series' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Runtime (seconds)</label>
                  <input
                    type="number"
                    value={formData.runtime_seconds}
                    onChange={(e) =>
                      setFormData({ ...formData, runtime_seconds: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-4 py-2 bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-glow"
                    min="0"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">Description (optional)</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-glow"
                  rows={3}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="
                  w-full px-6 py-3 rounded-lg font-semibold
                  bg-amber-glow hover:bg-amber-600
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all duration-300
                  glow-amber
                "
              >
                {loading ? 'Adding...' : 'Add Title'}
              </button>

              {message && (
                <div
                  className={`p-4 rounded-lg ${
                    message.includes('Error') ? 'bg-red-900/50' : 'bg-green-900/50'
                  }`}
                >
                  {message}
                </div>
              )}
            </form>
          </div>
        )}

        {/* Series Management */}
        {activeTab === 'series' && (
          <div className="space-y-8">
            {/* Select Series */}
            <div className="bg-gray-900 rounded-lg p-6">
              <h2 className="text-2xl font-semibold mb-4">Select Series</h2>
              <select
                value={selectedSeries || ''}
                onChange={(e) => {
                  setSelectedSeries(e.target.value)
                  if (e.target.value) {
                    fetchSeriesData(e.target.value)
                  }
                }}
                className="w-full px-4 py-2 bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-glow"
              >
                <option value="">-- Select a series --</option>
                {seriesTitles.map((series) => (
                  <option key={series.id} value={series.id}>
                    {series.title}
                  </option>
                ))}
              </select>
            </div>

            {selectedSeries && (
              <>
                {/* Add Season */}
                <div className="bg-gray-900 rounded-lg p-6">
                  <h2 className="text-2xl font-semibold mb-4">Add Season</h2>
                  <form onSubmit={handleAddSeason} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Season Number</label>
                        <input
                          type="number"
                          value={seasonForm.season_number}
                          onChange={(e) =>
                            setSeasonForm({ ...seasonForm, season_number: parseInt(e.target.value) || 1 })
                          }
                          className="w-full px-4 py-2 bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-glow"
                          min="1"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Title</label>
                        <input
                          type="text"
                          value={seasonForm.title}
                          onChange={(e) => setSeasonForm({ ...seasonForm, title: e.target.value })}
                          className="w-full px-4 py-2 bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-glow"
                          placeholder="Season 1"
                          required
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full px-6 py-3 rounded-lg font-semibold bg-amber-glow hover:bg-amber-600 transition"
                    >
                      Add Season
                    </button>
                  </form>

                  {/* Existing Seasons */}
                  <div className="mt-6 space-y-2">
                    {seasons.map((season) => (
                      <div key={season.id} className="p-4 bg-gray-800 rounded-lg">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="font-semibold">Season {season.season_number}</span>: {season.title}
                          </div>
                          <button
                            onClick={() => {
                              setEpisodeForm({ ...episodeForm, season_id: season.id })
                              fetchEpisodes(season.id)
                            }}
                            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition text-sm"
                          >
                            Manage Episodes
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Add Episode */}
                {episodeForm.season_id && (
                  <div className="bg-gray-900 rounded-lg p-6">
                    <h2 className="text-2xl font-semibold mb-4">Add Episode</h2>
                    <form onSubmit={handleAddEpisode} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Episode Number</label>
                        <input
                          type="number"
                          value={episodeForm.episode_number}
                          onChange={(e) =>
                            setEpisodeForm({ ...episodeForm, episode_number: parseInt(e.target.value) || 1 })
                          }
                          className="w-full px-4 py-2 bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-glow"
                          min="1"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Title</label>
                        <input
                          type="text"
                          value={episodeForm.title}
                          onChange={(e) => setEpisodeForm({ ...episodeForm, title: e.target.value })}
                          className="w-full px-4 py-2 bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-glow"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Mux Playback ID</label>
                        <input
                          type="text"
                          value={episodeForm.mux_playback_id}
                          onChange={(e) => setEpisodeForm({ ...episodeForm, mux_playback_id: e.target.value })}
                          className="w-full px-4 py-2 bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-glow"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Runtime (seconds)</label>
                        <input
                          type="number"
                          value={episodeForm.runtime_seconds}
                          onChange={(e) =>
                            setEpisodeForm({ ...episodeForm, runtime_seconds: parseInt(e.target.value) || 0 })
                          }
                          className="w-full px-4 py-2 bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-glow"
                          min="0"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Description (optional)</label>
                        <textarea
                          value={episodeForm.description}
                          onChange={(e) => setEpisodeForm({ ...episodeForm, description: e.target.value })}
                          className="w-full px-4 py-2 bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-glow"
                          rows={2}
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full px-6 py-3 rounded-lg font-semibold bg-amber-glow hover:bg-amber-600 transition"
                      >
                        Add Episode
                      </button>
                    </form>

                    {/* Existing Episodes */}
                    <div className="mt-6 space-y-2">
                      {episodes.map((episode) => (
                        <div key={episode.id} className="p-4 bg-gray-800 rounded-lg">
                          <div className="font-semibold">
                            Episode {episode.episode_number}: {episode.title}
                          </div>
                          <div className="text-sm text-gray-400">
                            Mux ID: {episode.mux_playback_id}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {message && (
              <div
                className={`p-4 rounded-lg ${
                  message.includes('Error') ? 'bg-red-900/50' : 'bg-green-900/50'
                }`}
              >
                {message}
              </div>
            )}
          </div>
        )}

        {/* Existing Titles */}
        <div className="bg-gray-900 rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">All Titles ({titles.length})</h2>
          <div className="space-y-4">
            {titles.map((title) => (
              <div key={title.id} className="flex items-center gap-4 p-4 bg-gray-800 rounded-lg">
                <img
                  src={title.poster_url}
                  alt={title.title}
                  className="w-20 h-30 object-cover rounded"
                />
                <div className="flex-1">
                  <h3 className="font-semibold">{title.title}</h3>
                  <p className="text-sm text-gray-400">
                    {title.content_type} • {title.category}
                  </p>
                  {title.mux_playback_id && (
                    <p className="text-xs text-gray-500">Mux ID: {title.mux_playback_id}</p>
                  )}
                </div>
                <button
                  onClick={() => handleDeleteTitle(title.id)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition"
                >
                  Delete
                </button>
              </div>
            ))}
            {titles.length === 0 && (
              <p className="text-gray-400 text-center py-8">No titles yet. Add one above!</p>
            )}
          </div>
        </div>

        {/* Phase 3 Admin Navigation */}
        <div className="mt-8 bg-gray-900 rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-4">Phase 3: Admin Tools</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link
              href="/admin/creators"
              className="p-4 bg-gray-800 hover:bg-gray-700 rounded-lg transition text-center"
            >
              <div className="text-2xl mb-2">👥</div>
              <div className="text-sm font-medium">Creators</div>
            </Link>
            <Link
              href="/admin/ads"
              className="p-4 bg-gray-800 hover:bg-gray-700 rounded-lg transition text-center"
            >
              <div className="text-2xl mb-2">📺</div>
              <div className="text-sm font-medium">Ads</div>
            </Link>
            <Link
              href="/admin/settings"
              className="p-4 bg-gray-800 hover:bg-gray-700 rounded-lg transition text-center"
            >
              <div className="text-2xl mb-2">⚙️</div>
              <div className="text-sm font-medium">Settings</div>
            </Link>
            <Link
              href="/admin/analytics"
              className="p-4 bg-gray-800 hover:bg-gray-700 rounded-lg transition text-center"
            >
              <div className="text-2xl mb-2">📊</div>
              <div className="text-sm font-medium">Analytics</div>
            </Link>
          </div>
        </div>

        {/* Back to Home */}
        <div className="mt-8">
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function AdminTitlesPage() {
  return (
    <AdminGuard>
      <AdminTitlesContent />
    </AdminGuard>
  )
}
