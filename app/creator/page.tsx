'use client'

import { useState, useEffect } from 'react'
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
          <a
            href="/"
            className="inline-block mt-6 px-6 py-3 bg-amber-glow hover:bg-amber-600 rounded-lg transition"
          >
            Back to Home
          </a>
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
          <a
            href="/"
            className="inline-block px-6 py-3 bg-amber-glow hover:bg-amber-600 rounded-lg transition"
          >
            Go to Home & Sign In
          </a>
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
            <a
              href="/"
              className="inline-block px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
            >
              ← Back to Home
            </a>
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
            <a
              href="/"
              className="inline-block px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
            >
              ← Back to Home
            </a>
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
            <a
              href="/"
              className="inline-block px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
            >
              ← Back to Home
            </a>
          </div>
        </div>
      </div>
    )
  }

  // Approved - Show upload interface (placeholder for now)
  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">Creator Portal</h1>
        <p className="text-gray-400 mb-8">Upload & Manage Your Content</p>

        <div className="bg-green-900/30 border border-green-600 rounded-lg p-4 mb-8">
          <p className="text-green-400 font-semibold mb-2">✅ You're an Approved Creator!</p>
          <p className="text-sm text-gray-300">
            You can now upload videos to Warren Media. Content will be reviewed before going live.
          </p>
        </div>

        <div className="bg-gray-900 rounded-lg p-8 text-center">
          <p className="text-gray-400 text-lg mb-4">🚧 Upload Interface Coming Soon</p>
          <p className="text-sm text-gray-500">
            Mux direct upload integration will be added here. For now, contact an admin to upload
            content.
          </p>
        </div>

        <div className="mt-8">
          <a
            href="/"
            className="inline-block px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
          >
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  )
}

