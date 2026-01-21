'use client'

import { useState, useEffect } from 'react'
import { supabase, type FeatureFlag, getAllFeatureFlags } from '../../lib/supabaseClient'

export default function AdminSettingsPage() {
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchFeatureFlags()
  }, [])

  async function fetchFeatureFlags() {
    setLoading(true)
    try {
      const flags = await getAllFeatureFlags()
      setFeatureFlags(flags)
    } catch (error) {
      console.error('Error fetching feature flags:', error)
      setMessage('Error loading feature flags')
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleFlag(featureName: string, currentValue: boolean) {
    setLoading(true)
    setMessage('')

    try {
      const { error } = await supabase
        .from('feature_flags')
        .update({ enabled: !currentValue, updated_at: new Date().toISOString() })
        .eq('feature_name', featureName)

      if (error) throw error

      setMessage(`Feature "${featureName}" ${!currentValue ? 'enabled' : 'disabled'}`)
      fetchFeatureFlags()
    } catch (error) {
      setMessage('Error updating feature flag: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">Phase 3 Settings</h1>
        <p className="text-gray-400 mb-8">Feature Flags & System Configuration</p>

        {/* Warning */}
        <div className="bg-red-900/30 border border-red-600 rounded-lg p-4 mb-8">
          <p className="text-red-400 font-semibold mb-2">🚨 Critical: Phase 3 Control Panel</p>
          <p className="text-sm text-gray-300">
            Phase 3 features must remain DISABLED until Phase 2 is formally accepted.
            Enabling these features will make them visible to end users.
          </p>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.includes('Error') ? 'bg-red-900/50' : 'bg-green-900/50'
            }`}
          >
            {message}
          </div>
        )}

        {/* Feature Flags */}
        <div className="bg-gray-900 rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Feature Flags</h2>
          {loading && <p className="text-gray-400">Loading...</p>}
          <div className="space-y-4">
            {featureFlags.map((flag) => (
              <div
                key={flag.id}
                className="p-6 bg-gray-800 rounded-lg flex justify-between items-center"
              >
                <div className="flex-1">
                  <h3 className="text-lg font-semibold capitalize mb-1">
                    {flag.feature_name.replace(/_/g, ' ')}
                  </h3>
                  {flag.description && (
                    <p className="text-sm text-gray-400">{flag.description}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    Last updated: {new Date(flag.updated_at).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => handleToggleFlag(flag.feature_name, flag.enabled)}
                  disabled={loading}
                  className={`
                    px-6 py-3 rounded-lg font-semibold transition min-w-[120px]
                    ${
                      flag.enabled
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-gray-700 hover:bg-gray-600'
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  {flag.enabled ? 'ENABLED' : 'DISABLED'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Feature Descriptions */}
        <div className="mt-8 bg-gray-900 rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-4">Feature Descriptions</h3>
          <div className="space-y-4 text-sm">
            <div>
              <p className="font-semibold text-amber-glow">creator_uploads</p>
              <p className="text-gray-400">
                Enables the creator upload portal. Approved creators can upload videos via Mux
                direct upload.
              </p>
            </div>
            <div>
              <p className="font-semibold text-amber-glow">ads_system</p>
              <p className="text-gray-400">
                Enables pre-roll ads before content playback. Ads must be configured per-title in
                the Ads Management panel.
              </p>
            </div>
            <div>
              <p className="font-semibold text-amber-glow">event_tracking</p>
              <p className="text-gray-400">
                Enables tracking of play events, completion events, and ad impressions for
                analytics.
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-8 flex gap-4">
          <a
            href="/admin/ads"
            className="inline-block px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
          >
            ← Manage Ads
          </a>
          <a
            href="/admin/analytics"
            className="inline-block px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
          >
            Analytics →
          </a>
        </div>
      </div>
    </div>
  )
}

