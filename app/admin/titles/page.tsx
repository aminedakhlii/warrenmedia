'use client'

import { useState, useEffect } from 'react'
import { supabase, type Title } from '../../lib/supabaseClient'

export default function AdminTitlesPage() {
  const [titles, setTitles] = useState<Title[]>([])
  const [formData, setFormData] = useState({
    title: '',
    poster_url: '',
    mux_playback_id: '',
    category: 'trending' as 'trending' | 'originals' | 'new_releases',
    runtime_seconds: 0,
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  // Fetch existing titles
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const { error } = await supabase.from('titles').insert([formData])

      if (error) throw error

      setMessage('Title added successfully!')
      setFormData({
        title: '',
        poster_url: '',
        mux_playback_id: '',
        category: 'trending',
        runtime_seconds: 0,
      })
      fetchTitles()
    } catch (error) {
      setMessage('Error adding title: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this title?')) return

    try {
      const { error } = await supabase.from('titles').delete().eq('id', id)

      if (error) throw error

      setMessage('Title deleted successfully!')
      fetchTitles()
    } catch (error) {
      setMessage('Error deleting title: ' + (error as Error).message)
    }
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Admin: Manage Titles</h1>

        {/* Add Title Form */}
        <div className="bg-gray-900 rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4">Add New Title</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
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

            <div>
              <label className="block text-sm font-medium mb-2">Mux Playback ID</label>
              <input
                type="text"
                value={formData.mux_playback_id}
                onChange={(e) => setFormData({ ...formData, mux_playback_id: e.target.value })}
                className="w-full px-4 py-2 bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-glow"
                placeholder="abc123xyz..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Category</label>
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    category: e.target.value as 'trending' | 'originals' | 'new_releases',
                  })
                }
                className="w-full px-4 py-2 bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-glow"
              >
                <option value="trending">Trending</option>
                <option value="originals">Originals</option>
                <option value="new_releases">New Releases</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Runtime (seconds)
              </label>
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

        {/* Existing Titles */}
        <div className="bg-gray-900 rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Existing Titles ({titles.length})</h2>
          <div className="space-y-4">
            {titles.map((title) => (
              <div
                key={title.id}
                className="flex items-center gap-4 p-4 bg-gray-800 rounded-lg"
              >
                <img
                  src={title.poster_url}
                  alt={title.title}
                  className="w-20 h-30 object-cover rounded"
                />
                <div className="flex-1">
                  <h3 className="font-semibold">{title.title}</h3>
                  <p className="text-sm text-gray-400">Category: {title.category}</p>
                  <p className="text-xs text-gray-500">
                    Mux ID: {title.mux_playback_id}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(title.id)}
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

        {/* Back to Home */}
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

