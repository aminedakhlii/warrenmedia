'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase, getCurrentUser, type UserProfile } from '../lib/supabaseClient'

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

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

      // Fetch existing profile
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', currentUser.id)
        .single()

      if (profileData) {
        setProfile(profileData)
        setDisplayName(profileData.display_name)
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()

    if (!user) {
      setMessage('Please sign in')
      return
    }

    if (displayName.length < 2 || displayName.length > 50) {
      setMessage('Display name must be between 2 and 50 characters')
      return
    }

    setSaving(true)
    setMessage('')

    try {
      if (profile) {
        // Update existing profile
        const { error } = await supabase
          .from('user_profiles')
          .update({ display_name: displayName.trim() })
          .eq('user_id', user.id)

        if (error) throw error
      } else {
        // Create new profile
        const { data, error } = await supabase
          .from('user_profiles')
          .insert({
            user_id: user.id,
            display_name: displayName.trim(),
          })
          .select()
          .single()

        if (error) throw error
        setProfile(data)
      }

      setMessage('✅ Profile saved!')
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      setMessage('❌ Error: ' + (error as Error).message)
    } finally {
      setSaving(false)
    }
  }

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
          <h1 className="text-4xl font-bold mb-4">Profile</h1>
          <p className="text-gray-400 mb-6">Please sign in to manage your profile.</p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-amber-glow hover:bg-amber-600 rounded-lg font-semibold transition"
          >
            Go to Homepage
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold">My Profile</h1>
          <Link
            href="/"
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
          >
            ← Back to Home
          </Link>
        </div>

        <div className="bg-gray-900 rounded-lg p-6 mb-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">Account Information</h2>
            <div className="space-y-2">
              <div>
                <span className="text-gray-400 text-sm">Email:</span>
                <p className="text-gray-200">{user.email}</p>
              </div>
              <div>
                <span className="text-gray-400 text-sm">User ID:</span>
                <p className="text-gray-200 font-mono text-xs">{user.id}</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSave}>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Display Name *
                <span className="text-gray-500 text-xs ml-2">
                  (This is how you appear in comments)
                </span>
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-glow"
                placeholder="Enter your display name"
                minLength={2}
                maxLength={50}
                required
                disabled={saving}
              />
              <p className="text-xs text-gray-500 mt-1">
                {displayName.length}/50 characters (min: 2, max: 50)
              </p>
            </div>

            {message && (
              <div
                className={`mb-4 p-4 rounded-lg ${
                  message.includes('Error') || message.includes('❌')
                    ? 'bg-red-900/50 text-red-300'
                    : 'bg-green-900/50 text-green-300'
                }`}
              >
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full px-6 py-3 bg-amber-glow hover:bg-amber-600 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed text-black"
            >
              {saving ? 'Saving...' : profile ? 'Update Profile' : 'Create Profile'}
            </button>
          </form>
        </div>

        <div className="bg-blue-900/20 border border-blue-600/50 rounded-lg p-4">
          <h3 className="font-semibold mb-2 text-blue-300">💡 About Display Names</h3>
          <ul className="text-sm text-gray-300 space-y-1">
            <li>• Your display name appears next to your comments</li>
            <li>• Choose a name that represents you</li>
            <li>• You can change it anytime</li>
            <li>• Keep it respectful and appropriate</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

