'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { supabase, getCurrentUser, getFeatureFlag, type Creator, type Title, type Season, type Episode, ContentType } from '../lib/supabaseClient'

export default function CreatorPortalPage() {
  const [user, setUser] = useState<any>(null)
  const [creator, setCreator] = useState<Creator | null>(null)
  const [uploadsEnabled, setUploadsEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [activeTab, setActiveTab] = useState<'upload' | 'manage' | 'series'>('upload')

  // Application form
  const [applicationForm, setApplicationForm] = useState({
    name: '',
    bio: '',
    application_notes: '',
  })

  useEffect(() => {
    init()
  }, [])

  async function init() {
    try {
      const currentUser = await getCurrentUser()
      setUser(currentUser)

      if (!currentUser) {
        setLoading(false)
        return
      }

      // Check feature flag
      const enabled = await getFeatureFlag('creator_uploads')
      setUploadsEnabled(enabled)

      // Check if user has a creator profile
      const { data: creatorData } = await supabase
        .from('creators')
        .select('*')
        .eq('user_id', currentUser.id)
        .single()

      setCreator(creatorData)
    } catch (error) {
      console.error('Error initializing:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    setMessage('')

    try {
      const { error } = await supabase.from('creators').insert({
        user_id: user.id,
        ...applicationForm,
        status: 'pending',
      })

      if (error) throw error

      setMessage('✅ Application submitted! You will be notified once reviewed.')
      setApplicationForm({ name: '', bio: '', application_notes: '' })

      // Refresh creator status
      setTimeout(() => {
        init()
      }, 1000)
    } catch (error) {
      setMessage('❌ Error: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  // Render different states
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-md text-center">
          <h1 className="text-4xl font-bold mb-4">Creator Portal</h1>
          <p className="text-gray-400 mb-6">Please sign in to access the creator portal.</p>
          <a
            href="/"
            className="inline-block px-6 py-3 bg-amber-glow hover:bg-amber-600 rounded-lg font-semibold transition"
          >
            Go to Homepage
          </a>
        </div>
      </div>
    )
  }

  if (!uploadsEnabled) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-md text-center">
          <h1 className="text-4xl font-bold mb-4">Creator Portal</h1>
          <p className="text-gray-400 mb-6">
            Creator uploads are currently disabled. Please check back later.
          </p>
          <a
            href="/"
            className="inline-block px-6 py-3 bg-amber-glow hover:bg-amber-600 rounded-lg font-semibold transition"
          >
            Go to Homepage
          </a>
        </div>
      </div>
    )
  }

  if (!creator || creator.status === 'pending') {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold mb-2">Creator Portal</h1>
          <p className="text-gray-400 mb-8">Apply to become a content creator</p>

          {creator?.status === 'pending' ? (
            <div className="bg-blue-900/30 border border-blue-600 rounded-lg p-6">
              <p className="text-blue-400 font-semibold mb-2">⏳ Application Pending</p>
              <p className="text-sm text-gray-300">
                Your application is under review. You'll receive an email once it's approved.
              </p>
            </div>
          ) : (
            <div className="bg-gray-900 rounded-lg p-6">
              <h2 className="text-2xl font-semibold mb-4">Apply as Creator</h2>
              <form onSubmit={handleApply} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Display Name *</label>
                  <input
                    type="text"
                    value={applicationForm.name}
                    onChange={(e) => setApplicationForm({ ...applicationForm, name: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-glow"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Bio *</label>
                  <textarea
                    value={applicationForm.bio}
                    onChange={(e) => setApplicationForm({ ...applicationForm, bio: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-glow"
                    rows={4}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Why do you want to be a creator? (optional)
                  </label>
                  <textarea
                    value={applicationForm.application_notes}
                    onChange={(e) =>
                      setApplicationForm({ ...applicationForm, application_notes: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-glow"
                    rows={3}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-6 py-3 bg-amber-glow hover:bg-amber-600 rounded-lg font-semibold transition disabled:opacity-50"
                >
                  {loading ? 'Submitting...' : 'Submit Application'}
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
        </div>
      </div>
    )
  }

  if (creator.status === 'rejected') {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-md text-center">
          <h1 className="text-4xl font-bold mb-4">Application Rejected</h1>
          <p className="text-gray-400 mb-6">
            Unfortunately, your creator application was not approved at this time.
          </p>
          {creator.rejection_reason && (
            <div className="bg-red-900/30 border border-red-600 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-300">{creator.rejection_reason}</p>
            </div>
          )}
          <a
            href="/"
            className="inline-block px-6 py-3 bg-amber-glow hover:bg-amber-600 rounded-lg font-semibold transition"
          >
            Go to Homepage
          </a>
        </div>
      </div>
    )
  }

  // Creator is approved - show full interface
  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Creator Space</h1>
            <p className="text-gray-400">Welcome back, {creator.name}!</p>
          </div>
          <Link
            href="/"
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
          >
            ← Back to Home
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-6 py-3 rounded-lg font-semibold transition ${
              activeTab === 'upload'
                ? 'bg-amber-glow text-black'
                : 'bg-gray-800 hover:bg-gray-700'
            }`}
          >
            Upload Content
          </button>
          <button
            onClick={() => setActiveTab('manage')}
            className={`px-6 py-3 rounded-lg font-semibold transition ${
              activeTab === 'manage'
                ? 'bg-amber-glow text-black'
                : 'bg-gray-800 hover:bg-gray-700'
            }`}
          >
            Manage Content
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

        {activeTab === 'upload' && <UploadTab creator={creator} />}
        {activeTab === 'manage' && <ManageContentTab creator={creator} />}
        {activeTab === 'series' && <ManageSeriesTab creator={creator} />}
      </div>
    </div>
  )
}

// Upload Tab Component
function UploadTab({ creator }: { creator: Creator }) {
  const [contentType, setContentType] = useState<ContentType>('film')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [message, setMessage] = useState('')
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [uploadedTitle, setUploadedTitle] = useState('')
  const [muxError, setMuxError] = useState(false)

  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    poster_url: '',
    category: 'originals' as 'trending' | 'originals' | 'new_releases' | 'music_videos',
  })

  const fileInputRef = useRef<HTMLInputElement>(null)

  async function pollForPlaybackId(uploadId: string, titleId: string, attempts = 0): Promise<void> {
    if (attempts > 20) {
      console.log('Max polling attempts reached for', uploadId)
      return
    }

    try {
      const response = await fetch(`/api/mux-status?uploadId=${uploadId}`)
      const data = await response.json()

      if (data.playbackId && data.ready) {
        await supabase
          .from('titles')
          .update({
            mux_playback_id: data.playbackId,
            runtime_seconds: Math.floor(data.duration || 0),
          })
          .eq('id', titleId)

        await supabase
          .from('mux_uploads')
          .update({
            mux_asset_id: data.assetId,
            mux_playback_id: data.playbackId,
            status: 'ready',
          })
          .eq('mux_upload_id', uploadId)

        console.log('Video ready:', data.playbackId)
      } else {
        setTimeout(() => pollForPlaybackId(uploadId, titleId, attempts + 1), 5000)
      }
    } catch (error) {
      console.error('Error polling Mux status:', error)
      setTimeout(() => pollForPlaybackId(uploadId, titleId, attempts + 1), 5000)
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!uploadForm.title) {
      setMessage('Please enter a title first')
      return
    }

    setUploading(true)
    setMessage('')
    setUploadProgress(0)
    setMuxError(false)

    try {
      const response = await fetch('/api/mux-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId: creator.id,
          metadata: {
            title: uploadForm.title,
            description: uploadForm.description,
          },
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.needsSetup) {
          setMuxError(true)
          setMessage(
            'Mux is not configured. Please contact the administrator.'
          )
          return
        }
        throw new Error(data.error || 'Failed to create upload')
      }

      setMessage('Uploading...')

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

      const { data: titleData, error: dbError } = await supabase
        .from('titles')
        .insert({
          title: uploadForm.title,
          description: uploadForm.description,
          poster_url: uploadForm.poster_url || 'https://via.placeholder.com/240x360?text=Processing',
          mux_playback_id: null,
          content_type: contentType,
          category: uploadForm.category,
          creator_id: creator.id,
          is_creator_content: true,
        })
        .select()
        .single()

      if (dbError) throw dbError

      await supabase.from('mux_uploads').insert({
        creator_id: creator.id,
        mux_upload_id: data.uploadId,
        status: 'asset_created',
        title_metadata: { title_id: titleData.id },
      })

      pollForPlaybackId(data.uploadId, titleData.id)

      setUploadedTitle(uploadForm.title)
      setShowSuccessModal(true)
      setMessage('')
      setUploadForm({
        title: '',
        description: '',
        poster_url: '',
        category: 'originals',
      })
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      console.error('Upload error:', error)
      setMessage(`❌ Error: ${(error as Error).message}`)
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  return (
    <>
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="bg-gray-900 rounded-lg p-8 max-w-md mx-4 border-2 border-green-600">
            <div className="text-center">
              <div className="text-6xl mb-4">✅</div>
              <h2 className="text-2xl font-bold mb-2 text-green-400">Upload Successful!</h2>
              <p className="text-gray-300 mb-4">
                "{uploadedTitle}" has been uploaded and is now processing.
              </p>
              <p className="text-sm text-gray-400 mb-6">
                Processing usually takes 2-5 minutes. Your video will be available once processing is complete.
              </p>
              <button
                onClick={() => setShowSuccessModal(false)}
                className="w-full px-6 py-3 bg-amber-glow hover:bg-amber-600 rounded-lg font-semibold transition"
              >
                Upload Another
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-gray-900 rounded-lg p-6">
        <h2 className="text-2xl font-semibold mb-4">Upload New Content</h2>
        
        {muxError && (
          <div className="bg-red-900/30 border border-red-600 rounded-lg p-4 mb-6">
            <p className="text-red-400 font-semibold mb-2">⚠️ Configuration Error</p>
            <p className="text-sm text-gray-300">
              Video uploads are not configured. Please contact the administrator.
            </p>
          </div>
        )}

        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.includes('Error') || message.includes('⚠️')
                ? 'bg-red-900/50'
                : 'bg-blue-900/50'
            }`}
          >
            {message}
          </div>
        )}

        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Content Type *</label>
            <select
              value={contentType}
              onChange={(e) => setContentType(e.target.value as ContentType)}
              className="w-full px-4 py-2 bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-glow"
              disabled={uploading}
            >
              <option value="film">Film / Video</option>
              <option value="series">Series</option>
              <option value="music_video">Music Video</option>
              <option value="podcast">Podcast (Audio)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Title *</label>
            <input
              type="text"
              value={uploadForm.title}
              onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
              className="w-full px-4 py-2 bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-glow"
              required
              disabled={uploading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Poster Image URL *</label>
            <input
              type="url"
              value={uploadForm.poster_url}
              onChange={(e) => setUploadForm({ ...uploadForm, poster_url: e.target.value })}
              className="w-full px-4 py-2 bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-glow"
              placeholder="https://example.com/poster.jpg"
              required
              disabled={uploading}
            />
          </div>

          {contentType !== 'series' && (
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
                    accept={contentType === 'podcast' ? 'audio/*' : 'video/*'}
                    onChange={handleFileSelect}
                    className="hidden"
                    id="creator-file-input"
                  />
                  <label
                    htmlFor="creator-file-input"
                    className="cursor-pointer inline-block px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
                  >
                    📁 Choose {contentType === 'podcast' ? 'Audio' : 'Video'} File
                  </label>
                  <p className="text-xs text-gray-500 mt-2">
                    File will be uploaded and processed automatically
                  </p>
                </>
              )}
            </div>
          )}

          {contentType === 'series' && (
            <div className="bg-blue-900/30 border border-blue-600 rounded-lg p-4">
              <p className="text-blue-400 font-semibold mb-2">📺 Series Content</p>
              <p className="text-sm text-gray-300">
                After creating the series, use the "Manage Series" tab to add seasons and episodes.
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Category</label>
            <select
              value={uploadForm.category}
              onChange={(e) =>
                setUploadForm({
                  ...uploadForm,
                  category: e.target.value as typeof uploadForm.category,
                })
              }
              className="w-full px-4 py-2 bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-glow"
              disabled={uploading}
            >
              <option value="trending">Trending</option>
              <option value="originals">Originals</option>
              <option value="new_releases">New Releases</option>
              <option value="music_videos">Music Videos</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description (optional)</label>
            <textarea
              value={uploadForm.description}
              onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
              className="w-full px-4 py-2 bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-glow"
              rows={4}
              disabled={uploading}
            />
          </div>

          {contentType === 'series' && (
            <button
              type="button"
              onClick={async () => {
                if (!uploadForm.title || !uploadForm.poster_url) {
                  setMessage('Please fill in title and poster URL')
                  return
                }
                
                try {
                  const { error } = await supabase.from('titles').insert({
                    title: uploadForm.title,
                    description: uploadForm.description,
                    poster_url: uploadForm.poster_url,
                    mux_playback_id: null,
                    content_type: 'series',
                    category: uploadForm.category,
                    creator_id: creator.id,
                    is_creator_content: true,
                  })

                  if (error) throw error

                  setMessage('✅ Series created! Go to "Manage Series" tab to add seasons and episodes.')
                  setUploadForm({
                    title: '',
                    description: '',
                    poster_url: '',
                    category: 'originals',
                  })
                } catch (error) {
                  setMessage(`❌ Error: ${(error as Error).message}`)
                }
              }}
              className="w-full px-6 py-3 bg-amber-glow hover:bg-amber-600 rounded-lg font-semibold transition"
            >
              Create Series
            </button>
          )}
        </form>
      </div>
    </>
  )
}

// Manage Content Tab Component
function ManageContentTab({ creator }: { creator: Creator }) {
  const [titles, setTitles] = useState<Title[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchTitles()
  }, [])

  async function fetchTitles() {
    setLoading(true)
    const { data } = await supabase
      .from('titles')
      .select('*')
      .eq('creator_id', creator.id)
      .order('created_at', { ascending: false })

    if (data) {
      setTitles(data)
    }
    setLoading(false)
  }

  async function deleteTitle(titleId: string) {
    if (!confirm('Are you sure you want to delete this content? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase.from('titles').delete().eq('id', titleId)

      if (error) throw error

      setMessage('✅ Content deleted successfully!')
      fetchTitles()
    } catch (error) {
      setMessage('❌ Error deleting content: ' + (error as Error).message)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading...</div>
  }

  return (
    <div className="bg-gray-900 rounded-lg p-6">
      <h2 className="text-2xl font-semibold mb-4">Your Content</h2>

      {message && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            message.includes('Error') ? 'bg-red-900/50' : 'bg-green-900/50'
          }`}
        >
          {message}
        </div>
      )}

      {titles.length === 0 ? (
        <p className="text-gray-400 text-center py-8">
          You haven't uploaded any content yet. Use the "Upload Content" tab to get started!
        </p>
      ) : (
        <div className="space-y-4">
          {titles.map((title) => (
            <div
              key={title.id}
              className="flex items-center gap-4 bg-gray-800 rounded-lg p-4"
            >
              <img
                src={title.poster_url}
                alt={title.title}
                className="w-20 h-30 object-cover rounded"
              />
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{title.title}</h3>
                <p className="text-sm text-gray-400 capitalize">{title.content_type}</p>
                <p className="text-sm text-gray-500">
                  {title.mux_playback_id ? '✅ Ready' : '⏳ Processing'}
                </p>
              </div>
              <button
                onClick={() => deleteTitle(title.id)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition text-sm"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Manage Series Tab Component
function ManageSeriesTab({ creator }: { creator: Creator }) {
  const [seriesTitles, setSeriesTitles] = useState<Title[]>([])
  const [selectedSeries, setSelectedSeries] = useState<string | null>(null)
  const [seasons, setSeasons] = useState<Season[]>([])
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

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

  const [uploadingEpisode, setUploadingEpisode] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const episodeFileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchSeriesTitles()
  }, [])

  useEffect(() => {
    if (selectedSeries) {
      fetchSeriesData(selectedSeries)
    }
  }, [selectedSeries])

  async function fetchSeriesTitles() {
    const { data } = await supabase
      .from('titles')
      .select('*')
      .eq('creator_id', creator.id)
      .eq('content_type', 'series')
      .order('created_at', { ascending: false })

    if (data) {
      setSeriesTitles(data)
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

  async function pollForEpisodePlaybackId(uploadId: string, episodeId: string, attempts = 0): Promise<void> {
    if (attempts > 20) return

    try {
      const response = await fetch(`/api/mux-status?uploadId=${uploadId}`)
      const data = await response.json()

      if (data.playbackId && data.ready) {
        await supabase
          .from('episodes')
          .update({
            mux_playback_id: data.playbackId,
            runtime_seconds: Math.floor(data.duration || 0),
          })
          .eq('id', episodeId)

        if (episodeForm.season_id) {
          fetchEpisodes(episodeForm.season_id)
        }
      } else {
        setTimeout(() => pollForEpisodePlaybackId(uploadId, episodeId, attempts + 1), 5000)
      }
    } catch (error) {
      console.error('Error polling:', error)
      setTimeout(() => pollForEpisodePlaybackId(uploadId, episodeId, attempts + 1), 5000)
    }
  }

  async function handleEpisodeFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !episodeForm.title || !episodeForm.season_id) {
      setMessage('Please fill in episode title and select a season first')
      return
    }

    setUploadingEpisode(true)
    setUploadProgress(0)
    setMessage('Uploading episode...')

    try {
      const response = await fetch('/api/mux-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId: creator.id,
          metadata: {
            title: episodeForm.title,
            description: episodeForm.description,
          },
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to create upload')

      const xhr = new XMLHttpRequest()
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          setUploadProgress(Math.round((e.loaded / e.total) * 100))
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

      setMessage('Processing episode...')

      const { data: episodeData, error } = await supabase
        .from('episodes')
        .insert({
          season_id: episodeForm.season_id,
          episode_number: episodeForm.episode_number,
          title: episodeForm.title,
          description: episodeForm.description,
          mux_playback_id: null,
          runtime_seconds: 0,
        })
        .select()
        .single()

      if (error) throw error

      await supabase.from('mux_uploads').insert({
        creator_id: creator.id,
        mux_upload_id: data.uploadId,
        status: 'asset_created',
        title_metadata: { episode_id: episodeData.id },
      })

      pollForEpisodePlaybackId(data.uploadId, episodeData.id)

      setMessage('✅ Episode uploaded! Processing in background...')
      setEpisodeForm({
        ...episodeForm,
        episode_number: episodeForm.episode_number + 1,
        title: '',
        description: '',
      })
      if (episodeFileRef.current) {
        episodeFileRef.current.value = ''
      }
      fetchEpisodes(episodeForm.season_id)
    } catch (error) {
      setMessage(`❌ Error: ${(error as Error).message}`)
    } finally {
      setUploadingEpisode(false)
      setUploadProgress(0)
    }
  }

  const handleAddSeason = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSeries) return

    setLoading(true)
    setMessage('')

    try {
      const { error } = await supabase.from('seasons').insert({
        series_id: selectedSeries,
        ...seasonForm,
      })

      if (error) throw error

      setMessage('✅ Season added successfully!')
      setSeasonForm({
        season_number: seasonForm.season_number + 1,
        title: '',
      })
      fetchSeriesData(selectedSeries)
    } catch (error) {
      setMessage('❌ Error adding season: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.includes('Error') ? 'bg-red-900/50' : 'bg-green-900/50'
          }`}
        >
          {message}
        </div>
      )}

      {/* Select Series */}
      <div className="bg-gray-900 rounded-lg p-6">
        <h2 className="text-2xl font-semibold mb-4">Select Series</h2>
        {seriesTitles.length === 0 ? (
          <p className="text-gray-400">
            No series found. Create a series from the "Upload Content" tab first.
          </p>
        ) : (
          <select
            value={selectedSeries || ''}
            onChange={(e) => setSelectedSeries(e.target.value)}
            className="w-full px-4 py-2 bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-glow"
          >
            <option value="">-- Select a Series --</option>
            {seriesTitles.map((series) => (
              <option key={series.id} value={series.id}>
                {series.title}
              </option>
            ))}
          </select>
        )}
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
                  <label className="block text-sm font-medium mb-2">Season Title</label>
                  <input
                    type="text"
                    value={seasonForm.title}
                    onChange={(e) => setSeasonForm({ ...seasonForm, title: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-glow"
                    placeholder="e.g., Season 1"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-amber-glow hover:bg-amber-600 rounded-lg font-semibold transition disabled:opacity-50"
              >
                {loading ? 'Adding...' : 'Add Season'}
              </button>
            </form>
          </div>

          {/* Seasons List & Add Episode */}
          {seasons.length > 0 && (
            <div className="bg-gray-900 rounded-lg p-6">
              <h2 className="text-2xl font-semibold mb-4">Add Episode</h2>
              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Season</label>
                  <select
                    value={episodeForm.season_id}
                    onChange={(e) => {
                      setEpisodeForm({ ...episodeForm, season_id: e.target.value })
                      if (e.target.value) {
                        fetchEpisodes(e.target.value)
                      }
                    }}
                    className="w-full px-4 py-2 bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-glow"
                  >
                    <option value="">-- Select Season --</option>
                    {seasons.map((season) => (
                      <option key={season.id} value={season.id}>
                        {season.title}
                      </option>
                    ))}
                  </select>
                </div>

                {episodeForm.season_id && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Episode Number</label>
                        <input
                          type="number"
                          value={episodeForm.episode_number}
                          onChange={(e) =>
                            setEpisodeForm({
                              ...episodeForm,
                              episode_number: parseInt(e.target.value) || 1,
                            })
                          }
                          className="w-full px-4 py-2 bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-glow"
                          min="1"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Episode Title</label>
                        <input
                          type="text"
                          value={episodeForm.title}
                          onChange={(e) => setEpisodeForm({ ...episodeForm, title: e.target.value })}
                          className="w-full px-4 py-2 bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-glow"
                          required
                          disabled={uploadingEpisode}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Description</label>
                      <textarea
                        value={episodeForm.description}
                        onChange={(e) => setEpisodeForm({ ...episodeForm, description: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-glow"
                        rows={3}
                        disabled={uploadingEpisode}
                      />
                    </div>

                    <div className="border-2 border-dashed border-gray-700 rounded-lg p-6 text-center">
                      {uploadingEpisode ? (
                        <div>
                          <div className="mb-2 text-amber-400">Uploading... {uploadProgress}%</div>
                          <div className="w-full bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-amber-glow h-2 rounded-full transition-all"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <>
                          <input
                            ref={episodeFileRef}
                            type="file"
                            accept="video/*"
                            onChange={handleEpisodeFileUpload}
                            className="hidden"
                            id="episode-file-input"
                          />
                          <label
                            htmlFor="episode-file-input"
                            className="cursor-pointer inline-block px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
                          >
                            📁 Choose Episode Video
                          </label>
                        </>
                      )}
                    </div>

                    {/* Episodes List */}
                    {episodes.length > 0 && (
                      <div className="mt-6">
                        <h3 className="text-lg font-semibold mb-3">Episodes</h3>
                        <div className="space-y-2">
                          {episodes.map((episode) => (
                            <div
                              key={episode.id}
                              className="flex items-center justify-between bg-gray-800 rounded p-3"
                            >
                              <div>
                                <p className="font-medium">
                                  E{episode.episode_number}: {episode.title}
                                </p>
                                <p className="text-sm text-gray-400">
                                  {episode.mux_playback_id ? '✅ Ready' : '⏳ Processing'}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </form>
            </div>
          )}
        </>
      )}
    </div>
  )
}
