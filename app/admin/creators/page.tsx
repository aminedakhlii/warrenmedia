'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase, type Creator } from '../../lib/supabaseClient'

export default function AdminCreatorsPage() {
  const [creators, setCreators] = useState<Creator[]>([])
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchCreators()
  }, [filter])

  async function fetchCreators() {
    setLoading(true)
    try {
      let query = supabase.from('creators').select('*').order('created_at', { ascending: false })

      if (filter !== 'all') {
        query = query.eq('status', filter)
      }

      const { data, error } = await query

      if (error) throw error
      setCreators(data || [])
    } catch (error) {
      console.error('Error fetching creators:', error)
      setMessage('Error loading creators')
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdateStatus(creatorId: string, status: 'approved' | 'rejected', adminNotes?: string) {
    setLoading(true)
    setMessage('')

    try {
      const { error } = await supabase
        .from('creators')
        .update({
          status,
          admin_notes: adminNotes,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', creatorId)

      if (error) throw error

      setMessage(`Creator ${status} successfully!`)
      fetchCreators()
    } catch (error) {
      setMessage('Error updating creator: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteCreator(creatorId: string, creatorName: string) {
    if (!confirm(`⚠️ WARNING: Delete creator "${creatorName}"?\n\nThis will permanently delete:\n• The creator account\n• All content they uploaded\n• All associated data\n\nThis action cannot be undone.`)) {
      return
    }

    setLoading(true)
    setMessage('')

    try {
      // First, delete all titles created by this creator
      const { error: titlesError } = await supabase
        .from('titles')
        .delete()
        .eq('creator_id', creatorId)

      if (titlesError) throw titlesError

      // Then delete the creator
      const { error: creatorError } = await supabase
        .from('creators')
        .delete()
        .eq('id', creatorId)

      if (creatorError) throw creatorError

      setMessage(`Creator "${creatorName}" and all their content has been deleted.`)
      fetchCreators()
    } catch (error) {
      setMessage('Error deleting creator: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const pendingCount = creators.filter((c) => c.status === 'pending').length
  const approvedCount = creators.filter((c) => c.status === 'approved').length

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">Creator Management</h1>
        <p className="text-gray-400 mb-8">Phase 3: Controlled Creator Access</p>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-900 rounded-lg p-6">
            <div className="text-3xl font-bold text-amber-glow">{pendingCount}</div>
            <div className="text-sm text-gray-400">Pending Review</div>
          </div>
          <div className="bg-gray-900 rounded-lg p-6">
            <div className="text-3xl font-bold text-green-500">{approvedCount}</div>
            <div className="text-sm text-gray-400">Approved</div>
          </div>
          <div className="bg-gray-900 rounded-lg p-6">
            <div className="text-3xl font-bold">{creators.length}</div>
            <div className="text-sm text-gray-400">Total Applications</div>
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-4 mb-6">
          {['all', 'pending', 'approved', 'rejected'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-4 py-2 rounded-lg capitalize transition ${
                filter === f
                  ? 'bg-amber-glow text-black'
                  : 'bg-gray-800 hover:bg-gray-700'
              }`}
            >
              {f}
            </button>
          ))}
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

        {/* Creators List */}
        <div className="bg-gray-900 rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Applications</h2>
          {loading && <p className="text-gray-400">Loading...</p>}
          {!loading && creators.length === 0 && (
            <p className="text-gray-400 text-center py-8">No creators found</p>
          )}
          <div className="space-y-4">
            {creators.map((creator) => (
              <div key={creator.id} className="p-6 bg-gray-800 rounded-lg">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold">{creator.name}</h3>
                    <p className="text-sm text-gray-400">{creator.email}</p>
                    <p className="text-xs text-gray-500">
                      Applied: {new Date(creator.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      creator.status === 'approved'
                        ? 'bg-green-900/50 text-green-400'
                        : creator.status === 'pending'
                        ? 'bg-amber-900/50 text-amber-400'
                        : 'bg-red-900/50 text-red-400'
                    }`}
                  >
                    {creator.status}
                  </div>
                </div>

                {creator.bio && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-300 mb-1">Bio:</p>
                    <p className="text-sm text-gray-400">{creator.bio}</p>
                  </div>
                )}

                {creator.application_notes && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-300 mb-1">Application Notes:</p>
                    <p className="text-sm text-gray-400">{creator.application_notes}</p>
                  </div>
                )}

                {creator.admin_notes && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-300 mb-1">Admin Notes:</p>
                    <p className="text-sm text-gray-400">{creator.admin_notes}</p>
                  </div>
                )}

                {creator.status === 'pending' && (
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => {
                        const notes = prompt('Admin notes (optional):')
                        handleUpdateStatus(creator.id, 'approved', notes || undefined)
                      }}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => {
                        const notes = prompt('Reason for rejection:')
                        if (notes) {
                          handleUpdateStatus(creator.id, 'rejected', notes)
                        }
                      }}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition"
                    >
                      Reject
                    </button>
                  </div>
                )}

                {creator.status !== 'pending' && creator.reviewed_at && (
                  <p className="text-xs text-gray-500 mt-4">
                    Reviewed: {new Date(creator.reviewed_at).toLocaleDateString()}
                  </p>
                )}

                {/* Delete Creator */}
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <button
                    onClick={() => handleDeleteCreator(creator.id, creator.name)}
                    disabled={loading}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition text-sm disabled:opacity-50"
                  >
                    🗑️ Delete Creator & Content
                  </button>
                  <p className="text-xs text-gray-500 mt-2">
                    Permanently removes creator and all their uploaded content
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-8 flex gap-4">
          <Link
            href="/admin/titles"
            className="inline-block px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
          >
            ← Manage Titles
          </Link>
          <Link
            href="/admin/ads"
            className="inline-block px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
          >
            Manage Ads →
          </Link>
        </div>
      </div>
    </div>
  )
}

