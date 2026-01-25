'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase, getCurrentUser, type ReportedContent, type UserBan } from '../../lib/supabaseClient'
import AdminGuard from '../../components/AdminGuard'

function ModerationContent() {
  const [activeTab, setActiveTab] = useState<'reports' | 'bans'>('reports')

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold">Content Moderation</h1>
          <div className="flex gap-4">
            <Link href="/admin/titles" className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition">
              Manage Titles
            </Link>
            <Link href="/admin/settings" className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition">
              Settings
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-6 py-3 rounded-lg font-semibold transition ${
              activeTab === 'reports' ? 'bg-amber-glow text-black' : 'bg-gray-800 hover:bg-gray-700'
            }`}
          >
            Reported Content
          </button>
          <button
            onClick={() => setActiveTab('bans')}
            className={`px-6 py-3 rounded-lg font-semibold transition ${
              activeTab === 'bans' ? 'bg-amber-glow text-black' : 'bg-gray-800 hover:bg-gray-700'
            }`}
          >
            User Bans
          </button>
        </div>

        {activeTab === 'reports' && <ReportsTab />}
        {activeTab === 'bans' && <BansTab />}
      </div>
    </div>
  )
}

// Reported Content Tab
function ReportsTab() {
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [filter, setFilter] = useState<'all' | 'pending' | 'reviewed'>('pending')

  useEffect(() => {
    fetchReports()
  }, [filter])

  async function fetchReports() {
    setLoading(true)
    try {
      let query = supabase
        .from('reported_content')
        .select('*')
        .order('created_at', { ascending: false })

      if (filter !== 'all') {
        query = query.eq('status', filter)
      }

      const { data, error } = await query

      if (error) throw error

      // Fetch additional details for each report
      const reportsWithDetails = await Promise.all(
        (data || []).map(async (report) => {
          let contentDetails = null

          if (report.content_type === 'comment') {
            const { data: comment } = await supabase
              .from('comments')
              .select('content, user_id')
              .eq('id', report.content_id)
              .single()
            contentDetails = comment
          } else if (report.content_type === 'creator_post') {
            const { data: post } = await supabase
              .from('creator_posts')
              .select('content, creator_id')
              .eq('id', report.content_id)
              .single()
            contentDetails = post
          }

          return { ...report, contentDetails }
        })
      )

      setReports(reportsWithDetails)
    } catch (error) {
      console.error('Error fetching reports:', error)
      setMessage('Error loading reports')
    } finally {
      setLoading(false)
    }
  }

  async function hideContent(report: any) {
    if (!confirm('Hide this content? It will no longer be visible to users.')) return

    try {
      const table = report.content_type === 'comment' ? 'comments' : 'creator_posts'
      const user = await getCurrentUser()

      const { error } = await supabase
        .from(table)
        .update({
          is_hidden: true,
          hidden_by: user?.id,
          hidden_at: new Date().toISOString(),
          hidden_reason: report.reason,
        })
        .eq('id', report.content_id)

      if (error) throw error

      // Update report status
      await supabase
        .from('reported_content')
        .update({
          status: 'actioned',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          admin_notes: 'Content hidden',
        })
        .eq('id', report.id)

      setMessage('✅ Content hidden successfully')
      fetchReports()
    } catch (error) {
      setMessage('❌ Error: ' + (error as Error).message)
    }
  }

  async function dismissReport(reportId: string) {
    try {
      const user = await getCurrentUser()

      const { error } = await supabase
        .from('reported_content')
        .update({
          status: 'dismissed',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', reportId)

      if (error) throw error

      setMessage('✅ Report dismissed')
      fetchReports()
    } catch (error) {
      setMessage('❌ Error: ' + (error as Error).message)
    }
  }

  async function banUser(report: any) {
    const reason = prompt('Enter ban reason:')
    if (!reason) return

    const duration = prompt('Ban duration (hours, or leave empty for permanent):')
    const hours = duration ? parseInt(duration) : null

    try {
      const user = await getCurrentUser()
      const targetUserId = report.contentDetails?.user_id || report.content_id

      const { error } = await supabase.from('user_bans').insert({
        user_id: targetUserId,
        banned_by: user?.id,
        reason: reason,
        ban_type: 'comment',
        expires_at: hours ? new Date(Date.now() + hours * 60 * 60 * 1000).toISOString() : null,
        is_active: true,
      })

      if (error) throw error

      // Update report
      await supabase
        .from('reported_content')
        .update({
          status: 'actioned',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          admin_notes: 'User banned',
        })
        .eq('id', report.id)

      setMessage('✅ User banned successfully')
      fetchReports()
    } catch (error) {
      setMessage('❌ Error: ' + (error as Error).message)
    }
  }

  return (
    <div>
      {message && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            message.includes('Error') || message.includes('❌')
              ? 'bg-red-900/50'
              : 'bg-green-900/50'
          }`}
        >
          {message}
        </div>
      )}

      {/* Filter */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg transition ${
            filter === 'all' ? 'bg-amber-glow text-black' : 'bg-gray-800 hover:bg-gray-700'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 rounded-lg transition ${
            filter === 'pending' ? 'bg-amber-glow text-black' : 'bg-gray-800 hover:bg-gray-700'
          }`}
        >
          Pending
        </button>
        <button
          onClick={() => setFilter('reviewed')}
          className={`px-4 py-2 rounded-lg transition ${
            filter === 'reviewed' ? 'bg-amber-glow text-black' : 'bg-gray-800 hover:bg-gray-700'
          }`}
        >
          Reviewed
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading reports...</div>
      ) : reports.length === 0 ? (
        <div className="bg-gray-900 rounded-lg p-8 text-center text-gray-400">
          No reports found
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <div key={report.id} className="bg-gray-900 rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="px-3 py-1 bg-red-900/50 text-red-300 rounded text-xs font-semibold">
                      {report.content_type}
                    </span>
                    <span
                      className={`px-3 py-1 rounded text-xs font-semibold ${
                        report.status === 'pending'
                          ? 'bg-yellow-900/50 text-yellow-300'
                          : report.status === 'actioned'
                          ? 'bg-green-900/50 text-green-300'
                          : 'bg-gray-700 text-gray-300'
                      }`}
                    >
                      {report.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400">
                    Reported {new Date(report.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="bg-gray-800 rounded p-4 mb-4">
                <p className="text-sm text-gray-300 font-semibold mb-2">Reported Content:</p>
                <p className="text-gray-200">
                  {report.contentDetails?.content || '[Content not found]'}
                </p>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-300 font-semibold mb-1">Report Reason:</p>
                <p className="text-gray-200">{report.reason}</p>
              </div>

              {report.status === 'pending' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => hideContent(report)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition text-sm"
                  >
                    Hide Content
                  </button>
                  <button
                    onClick={() => banUser(report)}
                    className="px-4 py-2 bg-red-800 hover:bg-red-900 rounded-lg transition text-sm"
                  >
                    Ban User
                  </button>
                  <button
                    onClick={() => dismissReport(report.id)}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition text-sm"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// User Bans Tab
function BansTab() {
  const [bans, setBans] = useState<UserBan[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [showAddBan, setShowAddBan] = useState(false)
  const [banForm, setBanForm] = useState({
    userEmail: '',
    reason: '',
    hours: '',
  })

  useEffect(() => {
    fetchBans()
  }, [])

  async function fetchBans() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('user_bans')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error

      setBans(data || [])
    } catch (error) {
      console.error('Error fetching bans:', error)
      setMessage('Error loading bans')
    } finally {
      setLoading(false)
    }
  }

  async function handleAddBan(e: React.FormEvent) {
    e.preventDefault()

    try {
      const user = await getCurrentUser()

      // Find user by email
      const { data: userData, error: userError } = await supabase
        .from('auth.users')
        .select('id')
        .eq('email', banForm.userEmail)
        .single()

      if (userError) throw new Error('User not found')

      const hours = banForm.hours ? parseInt(banForm.hours) : null

      const { error } = await supabase.from('user_bans').insert({
        user_id: userData.id,
        banned_by: user?.id,
        reason: banForm.reason,
        ban_type: 'comment',
        expires_at: hours ? new Date(Date.now() + hours * 60 * 60 * 1000).toISOString() : null,
        is_active: true,
      })

      if (error) throw error

      setMessage('✅ User banned successfully')
      setBanForm({ userEmail: '', reason: '', hours: '' })
      setShowAddBan(false)
      fetchBans()
    } catch (error) {
      setMessage('❌ Error: ' + (error as Error).message)
    }
  }

  async function removeBan(banId: string) {
    if (!confirm('Remove this ban?')) return

    try {
      const { error } = await supabase
        .from('user_bans')
        .update({ is_active: false })
        .eq('id', banId)

      if (error) throw error

      setMessage('✅ Ban removed')
      fetchBans()
    } catch (error) {
      setMessage('❌ Error: ' + (error as Error).message)
    }
  }

  return (
    <div>
      {message && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            message.includes('Error') || message.includes('❌')
              ? 'bg-red-900/50'
              : 'bg-green-900/50'
          }`}
        >
          {message}
        </div>
      )}

      <button
        onClick={() => setShowAddBan(!showAddBan)}
        className="mb-6 px-6 py-3 bg-amber-glow hover:bg-amber-600 rounded-lg font-semibold transition text-black"
      >
        {showAddBan ? 'Cancel' : '+ Ban User'}
      </button>

      {showAddBan && (
        <div className="bg-gray-900 rounded-lg p-6 mb-6">
          <h3 className="text-xl font-semibold mb-4">Ban User</h3>
          <form onSubmit={handleAddBan} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">User Email</label>
              <input
                type="email"
                value={banForm.userEmail}
                onChange={(e) => setBanForm({ ...banForm, userEmail: e.target.value })}
                className="w-full px-4 py-2 bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-glow"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Reason</label>
              <textarea
                value={banForm.reason}
                onChange={(e) => setBanForm({ ...banForm, reason: e.target.value })}
                className="w-full px-4 py-2 bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-glow"
                rows={3}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Duration (hours, leave empty for permanent)
              </label>
              <input
                type="number"
                value={banForm.hours}
                onChange={(e) => setBanForm({ ...banForm, hours: e.target.value })}
                className="w-full px-4 py-2 bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-glow"
                min="1"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition"
            >
              Ban User
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">Loading bans...</div>
      ) : bans.length === 0 ? (
        <div className="bg-gray-900 rounded-lg p-8 text-center text-gray-400">
          No active bans
        </div>
      ) : (
        <div className="space-y-4">
          {bans.map((ban) => (
            <div key={ban.id} className="bg-gray-900 rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-400 mb-1">User ID:</p>
                  <p className="font-mono text-sm text-gray-300">{ban.user_id}</p>
                </div>
                <button
                  onClick={() => removeBan(ban.id)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition text-sm"
                >
                  Remove Ban
                </button>
              </div>

              <div className="mb-3">
                <p className="text-sm text-gray-400 mb-1">Reason:</p>
                <p className="text-gray-200">{ban.reason}</p>
              </div>

              <div className="flex gap-6 text-sm">
                <div>
                  <p className="text-gray-400">Banned:</p>
                  <p className="text-gray-300">{new Date(ban.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-400">Expires:</p>
                  <p className="text-gray-300">
                    {ban.expires_at ? new Date(ban.expires_at).toLocaleString() : 'Never (Permanent)'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


export default function ModerationPage() {
  return (
    <AdminGuard>
      <ModerationContent />
    </AdminGuard>
  )
}
