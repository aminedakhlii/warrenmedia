'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabaseClient'

export default function AdminAnalyticsPage() {
  const [stats, setStats] = useState({
    playEvents: 0,
    completionEvents: 0,
    adImpressions: 0,
    avgWatchPercentage: 0,
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchStats()
  }, [])

  async function fetchStats() {
    setLoading(true)
    try {
      // Play events count
      const { count: playCount } = await supabase
        .from('play_events')
        .select('*', { count: 'exact', head: true })

      // Completion events count
      const { count: completionCount } = await supabase
        .from('completion_events')
        .select('*', { count: 'exact', head: true })

      // Ad impressions count
      const { count: adCount } = await supabase
        .from('ad_impression_events')
        .select('*', { count: 'exact', head: true })

      // Average watch percentage
      const { data: completionData } = await supabase
        .from('completion_events')
        .select('watch_percentage')

      let avgPercentage = 0
      if (completionData && completionData.length > 0) {
        const total = completionData.reduce((sum, event) => sum + event.watch_percentage, 0)
        avgPercentage = total / completionData.length
      }

      setStats({
        playEvents: playCount || 0,
        completionEvents: completionCount || 0,
        adImpressions: adCount || 0,
        avgWatchPercentage: avgPercentage,
      })
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">Analytics</h1>
        <p className="text-gray-400 mb-8">Phase 3: Event Tracking (Lightweight)</p>

        {/* Info */}
        <div className="bg-blue-900/30 border border-blue-600 rounded-lg p-4 mb-8">
          <p className="text-blue-400 font-semibold mb-2">📊 Lightweight Event Tracking</p>
          <p className="text-sm text-gray-300">
            Basic events tracked: plays, completions, and ad impressions. Enable 'event_tracking' feature flag in Settings to start collecting data.
            No earnings, payouts, or detailed user analytics (by design).
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-900 rounded-lg p-6">
            <div className="text-4xl font-bold text-amber-glow">{stats.playEvents}</div>
            <div className="text-sm text-gray-400 mt-2">Play Events</div>
          </div>
          <div className="bg-gray-900 rounded-lg p-6">
            <div className="text-4xl font-bold text-green-500">{stats.completionEvents}</div>
            <div className="text-sm text-gray-400 mt-2">Completions</div>
          </div>
          <div className="bg-gray-900 rounded-lg p-6">
            <div className="text-4xl font-bold text-blue-500">{stats.adImpressions}</div>
            <div className="text-sm text-gray-400 mt-2">Ad Impressions</div>
          </div>
          <div className="bg-gray-900 rounded-lg p-6">
            <div className="text-4xl font-bold text-purple-500">
              {stats.avgWatchPercentage.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-400 mt-2">Avg. Watch %</div>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-900 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-2">Play Events</h3>
            <p className="text-sm text-gray-400">
              Logged when a user starts playback of any content. One event per play session.
            </p>
          </div>
          <div className="bg-gray-900 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-2">Completion Events</h3>
            <p className="text-sm text-gray-400">
              Logged when user closes Theater Mode, includes watch percentage to measure engagement.
            </p>
          </div>
          <div className="bg-gray-900 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-2">Ad Impressions</h3>
            <p className="text-sm text-gray-400">
              Pre-roll ads shown before content. Tracks both start and completion status.
            </p>
          </div>
        </div>

        {loading && (
          <div className="text-center py-8">
            <p className="text-gray-400">Loading analytics...</p>
          </div>
        )}

        {/* Out of Scope Notice */}
        <div className="bg-gray-900 rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-4">Not Tracked (Out of Scope)</h3>
          <ul className="space-y-2 text-sm text-gray-400">
            <li>• Creator earnings or revenue</li>
            <li>• Detailed viewer profiles or demographics</li>
            <li>• Geographic data</li>
            <li>• Device types or browsers</li>
            <li>• Conversion funnels</li>
            <li>• A/B testing or experiments</li>
          </ul>
        </div>

        {/* Navigation */}
        <div className="mt-8 flex gap-4">
          <Link
            href="/admin/settings"
            className="inline-block px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
          >
            ← Settings
          </Link>
          <Link
            href="/admin/titles"
            className="inline-block px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
          >
            Manage Titles →
          </Link>
        </div>
      </div>
    </div>
  )
}

