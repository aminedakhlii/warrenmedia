'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase, type Title, type TitleAdConfig } from '../../lib/supabaseClient'

export default function AdminAdsPage() {
  const [titles, setTitles] = useState<Title[]>([])
  const [adConfigs, setAdConfigs] = useState<Map<string, TitleAdConfig>>(new Map())
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    try {
      // Fetch all titles (except series)
      const { data: titlesData } = await supabase
        .from('titles')
        .select('*')
        .neq('content_type', 'series')
        .order('created_at', { ascending: false })

      // Fetch all ad configs
      const { data: adsData } = await supabase.from('title_ad_config').select('*')

      if (titlesData) {
        setTitles(titlesData)
      }

      if (adsData) {
        const configMap = new Map<string, TitleAdConfig>()
        adsData.forEach((config) => {
          configMap.set(config.title_id, config)
        })
        setAdConfigs(configMap)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      setMessage('Error loading data')
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleAds(titleId: string, currentlyEnabled: boolean) {
    setLoading(true)
    setMessage('')

    try {
      const config = adConfigs.get(titleId)

      if (config) {
        // Update existing config
        const { error } = await supabase
          .from('title_ad_config')
          .update({ ads_enabled: !currentlyEnabled })
          .eq('title_id', titleId)

        if (error) throw error
      } else {
        // Create new config
        const { error } = await supabase.from('title_ad_config').insert({
          title_id: titleId,
          ads_enabled: true,
          ad_duration_seconds: 15,
        })

        if (error) throw error
      }

      setMessage('Ad settings updated successfully!')
      fetchData()
    } catch (error) {
      setMessage('Error updating ads: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdateAdConfig(
    titleId: string,
    adDuration: number,
    adUrl: string
  ) {
    setLoading(true)
    setMessage('')

    try {
      const config = adConfigs.get(titleId)

      if (config) {
        const { error } = await supabase
          .from('title_ad_config')
          .update({
            ad_duration_seconds: adDuration,
            ad_url: adUrl || null,
          })
          .eq('title_id', titleId)

        if (error) throw error
      } else {
        const { error } = await supabase.from('title_ad_config').insert({
          title_id: titleId,
          ads_enabled: false,
          ad_duration_seconds: adDuration,
          ad_url: adUrl || null,
        })

        if (error) throw error
      }

      setMessage('Ad configuration updated!')
      fetchData()
    } catch (error) {
      setMessage('Error updating config: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const adsEnabledCount = Array.from(adConfigs.values()).filter((c) => c.ads_enabled).length

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">Ad Management</h1>
        <p className="text-gray-400 mb-8">Phase 3: Pre-roll Ads (Controlled)</p>

        {/* Info */}
        <div className="bg-blue-900/30 border border-blue-600 rounded-lg p-4 mb-8">
          <p className="text-blue-400 font-semibold mb-2">📺 Pre-Roll Ad System</p>
          <p className="text-sm text-gray-300">
            Configure pre-roll ads per title below. Ads will only play if the 'ads_system' feature flag is enabled in Settings.
            Pre-roll only - no mid-roll or post-roll. Duration: 5-30 seconds.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-gray-900 rounded-lg p-6">
            <div className="text-3xl font-bold text-amber-glow">{adsEnabledCount}</div>
            <div className="text-sm text-gray-400">Titles with Ads Enabled</div>
          </div>
          <div className="bg-gray-900 rounded-lg p-6">
            <div className="text-3xl font-bold">{titles.length}</div>
            <div className="text-sm text-gray-400">Total Titles (Ads Supported)</div>
          </div>
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

        {/* Titles List */}
        <div className="bg-gray-900 rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Configure Ads per Title</h2>
          {loading && <p className="text-gray-400">Loading...</p>}
          <div className="space-y-4">
            {titles.map((title) => {
              const config = adConfigs.get(title.id)
              const adsEnabled = config?.ads_enabled || false

              return (
                <div key={title.id} className="p-6 bg-gray-800 rounded-lg">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{title.title}</h3>
                        <span className="px-2 py-1 bg-gray-700 rounded text-xs">
                          {title.content_type}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400">{title.category}</p>
                    </div>

                    {/* Toggle Ads */}
                    <button
                      onClick={() => handleToggleAds(title.id, adsEnabled)}
                      className={`px-4 py-2 rounded-lg font-semibold transition ${
                        adsEnabled
                          ? 'bg-green-600 hover:bg-green-700'
                          : 'bg-gray-700 hover:bg-gray-600'
                      }`}
                    >
                      Ads: {adsEnabled ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  {/* Ad Config Form */}
                  <div className="mt-4 p-4 bg-gray-900 rounded-lg">
                    <p className="text-sm font-medium mb-3">Ad Configuration:</p>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">
                          Duration (seconds)
                        </label>
                        <input
                          type="number"
                          min="5"
                          max="30"
                          defaultValue={config?.ad_duration_seconds || 15}
                          className="w-full px-3 py-2 bg-gray-800 rounded text-sm"
                          onBlur={(e) => {
                            const duration = parseInt(e.target.value)
                            if (duration >= 5 && duration <= 30) {
                              handleUpdateAdConfig(
                                title.id,
                                duration,
                                config?.ad_url || ''
                              )
                            }
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">
                          Ad URL (video source)
                        </label>
                        <input
                          type="url"
                          defaultValue={config?.ad_url || ''}
                          placeholder="https://example.com/ad.mp4"
                          className="w-full px-3 py-2 bg-gray-800 rounded text-sm"
                          onBlur={(e) => {
                            handleUpdateAdConfig(
                              title.id,
                              config?.ad_duration_seconds || 15,
                              e.target.value
                            )
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-8 flex gap-4">
          <Link
            href="/admin/creators"
            className="inline-block px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
          >
            ← Creators
          </Link>
          <Link
            href="/admin/settings"
            className="inline-block px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
          >
            Settings →
          </Link>
        </div>
      </div>
    </div>
  )
}

