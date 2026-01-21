'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { supabase, getCurrentUser, getFeatureFlag, type Creator } from '../lib/supabaseClient'

export default function CreatorPortalPage() {
  const [user, setUser] = useState<any>(null)
  const [creator, setCreator] = useState<Creator | null>(null)
  const [uploadsEnabled, setUploadsEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

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

  async function handleSubmitApplication(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    setMessage('')

    try {
      const { error } = await supabase.from('creators').insert({
        user_id: user.id,
        email: user.email,
        ...applicationForm,
        status: 'pending',
      })

      if (error) throw error

      setMessage('Application submitted! We will review it shortly.')
      init()
    } catch (error) {
      setMessage('Error submitting application: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  // Feature disabled
  if (!uploadsEnabled) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-md text-center">
          <h1 className="text-3xl font-bold mb-4">Creator Portal</h1>
          <p className="text-gray-400">
            The creator upload feature is currently not available.
          </p>
          <Link
            href="/"
            className="inline-block mt-6 px-6 py-3 bg-amber-glow hover:bg-amber-600 rounded-lg transition"
          >
            Back to Home
          </Link>
        </div>
      </div>
    )
  }

  // Not logged in
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-md text-center">
          <h1 className="text-3xl font-bold mb-4">Creator Portal</h1>
          <p className="text-gray-400 mb-6">Please sign in to access the creator portal.</p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-amber-glow hover:bg-amber-600 rounded-lg transition"
          >
            Go to Home & Sign In
          </Link>
        </div>
      </div>
    )
  }

  // No application yet
  if (!creator) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold mb-2">Become a Creator</h1>
          <p className="text-gray-400 mb-8">Apply to upload content to Warren Media</p>

          <div className="bg-blue-900/30 border border-blue-600 rounded-lg p-4 mb-8">
            <p className="text-blue-400 font-semibold mb-2">📋 Curated Creator Community</p>
            <p className="text-sm text-gray-300">
              Join our curated community of creators. All applications are reviewed by our team to maintain quality and ensure a premium viewing experience.
              This is a controlled-access platform with no open signup.
            </p>
          </div>

          {message && (
            <div
              className={`mb-6 p-4 rounded-lg ${
                message.includes('Error') ? 'bg-red-900/50' : 'bg-green-900/50'
              }`}
            >
              {message}
            </div>
          )}

          <form onSubmit={handleSubmitApplication} className="bg-gray-900 rounded-lg p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Your Name</label>
              <input
                type="text"
                value={applicationForm.name}
                onChange={(e) => setApplicationForm({ ...applicationForm, name: e.target.value })}
                className="w-full px-4 py-2 bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-glow"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Bio</label>
              <textarea
                value={applicationForm.bio}
                onChange={(e) => setApplicationForm({ ...applicationForm, bio: e.target.value })}
                className="w-full px-4 py-2 bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-glow"
                rows={4}
                placeholder="Tell us about yourself and your content..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Why do you want to join?</label>
              <textarea
                value={applicationForm.application_notes}
                onChange={(e) =>
                  setApplicationForm({ ...applicationForm, application_notes: e.target.value })
                }
                className="w-full px-4 py-2 bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-glow"
                rows={4}
                placeholder="What type of content do you plan to create?"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="
                w-full px-6 py-3 rounded-lg font-semibold
                bg-amber-glow hover:bg-amber-600
                disabled:opacity-50 disabled:cursor-not-allowed
                transition
              "
            >
              {loading ? 'Submitting...' : 'Submit Application'}
            </button>
          </form>

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

  // Application pending
  if (creator.status === 'pending') {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold mb-2">Creator Portal</h1>
          <p className="text-gray-400 mb-8">Application Status</p>

          <div className="bg-amber-900/30 border border-amber-600 rounded-lg p-6">
            <p className="text-amber-400 font-semibold text-lg mb-2">⏳ Pending Review</p>
            <p className="text-gray-300">
              Your application is being reviewed by our team. We'll notify you once a decision is
              made.
            </p>
            <p className="text-sm text-gray-400 mt-4">
              Submitted: {new Date(creator.created_at).toLocaleDateString()}
            </p>
          </div>

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

  // Application rejected
  if (creator.status === 'rejected') {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold mb-2">Creator Portal</h1>
          <p className="text-gray-400 mb-8">Application Status</p>

          <div className="bg-red-900/30 border border-red-600 rounded-lg p-6">
            <p className="text-red-400 font-semibold text-lg mb-2">❌ Application Not Approved</p>
            <p className="text-gray-300 mb-4">
              Unfortunately, your application was not approved at this time.
            </p>
            {creator.admin_notes && (
              <div className="mt-4 p-4 bg-black/30 rounded">
                <p className="text-sm font-medium text-gray-300 mb-1">Admin Notes:</p>
                <p className="text-sm text-gray-400">{creator.admin_notes}</p>
              </div>
            )}
          </div>

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

  // Approved - Show upload interface
  return <CreatorUploadInterface creator={creator} user={user} />
}

// Creator Upload Interface Component
function CreatorUploadInterface({ creator, user }: { creator: Creator; user: any }) {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [message, setMessage] = useState('')
  const [uploadUrl, setUploadUrl] = useState<string | null>(null)
  const [muxError, setMuxError] = useState(false)

  // Upload form
  const [contentType, setContentType] = useState<'film' | 'music_video' | 'podcast'>('film')
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    poster_url: '',
    category: 'originals' as 'trending' | 'originals' | 'new_releases' | 'music_videos',
  })
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [uploadedTitle, setUploadedTitle] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Poll for playback ID from Mux
  async function pollForPlaybackId(uploadId: string, titleId: string, attempts = 0) {
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

        // Update mux_uploads status
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
        // Poll again in 5 seconds
        setTimeout(() => pollForPlaybackId(uploadId, titleId, attempts + 1), 5000)
      }
    } catch (error) {
      console.error('Error polling Mux status:', error)
      // Retry
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
      // Create Mux direct upload URL
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
            'Mux is not configured. Please add MUX_TOKEN_ID and MUX_TOKEN_SECRET to your .env.local file.'
          )
          return
        }
        throw new Error(data.error || 'Failed to create upload')
      }

      setUploadUrl(data.uploadUrl)

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

      // Save to database with upload ID for tracking
      const { data: titleData, error: dbError } = await supabase
        .from('titles')
        .insert({
          title: uploadForm.title,
          description: uploadForm.description,
          poster_url: uploadForm.poster_url || 'https://via.placeholder.com/240x360?text=Processing',
          mux_playback_id: null, // Will be updated when processing completes
          content_type: contentType,
          category: uploadForm.category,
          creator_id: creator.id,
          is_creator_content: true,
        })
        .select()
        .single()

      if (dbError) throw dbError

      // Track the upload for status checking
      await supabase.from('mux_uploads').insert({
        creator_id: creator.id,
        mux_upload_id: data.uploadId,
        status: 'asset_created',
        title_metadata: { title_id: titleData.id },
      })

      // Poll for playback ID
      pollForPlaybackId(data.uploadId, titleData.id)

      // Show success and reset form
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
      setMessage('Error: ' + (error as Error).message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen p-8">
      {/* Success Modal */}
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

      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">Creator Portal</h1>
        <p className="text-gray-400 mb-8">Upload & Manage Your Content</p>

        <div className="bg-green-900/30 border border-green-600 rounded-lg p-4 mb-8">
          <p className="text-green-400 font-semibold mb-2">✅ Welcome, {creator.name}!</p>
          <p className="text-sm text-gray-300">
            You can now upload videos to Warren Media. All uploads are subject to review.
          </p>
        </div>

        {muxError && (
          <div className="bg-amber-900/30 border border-amber-600 rounded-lg p-6 mb-8">
            <p className="text-amber-400 font-semibold mb-2">⚠️ Mux Setup Required</p>
            <p className="text-sm text-gray-300 mb-4">
              To enable video uploads, you need to configure Mux credentials:
            </p>
            <ol className="text-sm text-gray-300 space-y-2 ml-4 list-decimal">
              <li>Sign up at <a href="https://mux.com" target="_blank" className="text-amber-400 underline">mux.com</a></li>
              <li>Get your API Token ID and Secret from Settings → Access Tokens</li>
              <li>Add to your .env.local file:
                <pre className="mt-2 p-2 bg-black/30 rounded text-xs">
MUX_TOKEN_ID=your-token-id{'\n'}
MUX_TOKEN_SECRET=your-token-secret
                </pre>
              </li>
              <li>Restart your development server</li>
            </ol>
          </div>
        )}

        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.includes('Error') || message.includes('⚠️')
                ? 'bg-red-900/50'
                : message.includes('✅')
                ? 'bg-green-900/50'
                : 'bg-blue-900/50'
            }`}
          >
            {message}
          </div>
        )}

        {/* Upload Form */}
        <div className="bg-gray-900 rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4">Upload New Content</h2>
          <form className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Content Type *</label>
              <select
                value={contentType}
                onChange={(e) => setContentType(e.target.value as typeof contentType)}
                className="w-full px-4 py-2 bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-glow"
                disabled={uploading}
              >
                <option value="film">Film / Video</option>
                <option value="music_video">Music Video</option>
                <option value="podcast">Podcast (Audio)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Note: Series uploads coming soon. Contact admin for series content.
              </p>
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
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                value={uploadForm.description}
                onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                className="w-full px-4 py-2 bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-glow"
                rows={4}
                disabled={uploading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Poster Image URL</label>
              <input
                type="url"
                value={uploadForm.poster_url}
                onChange={(e) => setUploadForm({ ...uploadForm, poster_url: e.target.value })}
                className="w-full px-4 py-2 bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-glow"
                placeholder="https://example.com/poster.jpg"
                disabled={uploading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Category *</label>
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
              <label className="block text-sm font-medium mb-2">Video File *</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                className="w-full px-4 py-2 bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-glow file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-amber-glow file:text-black hover:file:bg-amber-600"
                disabled={uploading}
              />
              <p className="text-xs text-gray-500 mt-2">
                Supported formats: MP4, MOV, AVI. Max size: 5GB
              </p>
            </div>

            {uploading && (
              <div className="p-4 bg-gray-800 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">Uploading...</span>
                  <span className="text-sm">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-amber-glow h-2 rounded-full transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </form>
        </div>

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

