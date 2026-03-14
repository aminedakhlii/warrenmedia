'use client'

import Link from 'next/link'
import AdminGuard from '../components/AdminGuard'

const ADMIN_LINKS = [
  { href: '/admin/titles', label: 'Manage Titles', description: 'Add and manage films, series, and music videos' },
  { href: '/admin/creators', label: 'Creators', description: 'Review and manage creator applications' },
  { href: '/admin/ads', label: 'Ads', description: 'Configure ad campaigns and placements' },
  { href: '/admin/music', label: 'Music Channel', description: 'Playlist and live settings for Music TV' },
  { href: '/admin/moderation', label: 'Moderation', description: 'Content and user moderation' },
  { href: '/admin/analytics', label: 'Analytics', description: 'View platform analytics' },
  { href: '/admin/settings', label: 'Settings', description: 'Feature flags and global settings' },
]

function AdminDashboardContent() {
  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <Link
            href="/"
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition text-sm"
          >
            ← Back to site
          </Link>
        </div>

        <p className="text-gray-400 mb-8">
          Quick links to all admin tools.
        </p>

        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
          {ADMIN_LINKS.map(({ href, label, description }) => (
            <Link
              key={href}
              href={href}
              className="block p-5 bg-gray-900 border border-gray-800 rounded-lg hover:border-amber-500/50 hover:bg-gray-800/80 transition"
            >
              <h2 className="text-lg font-semibold text-white mb-1">{label}</h2>
              <p className="text-sm text-gray-400">{description}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function AdminDashboardPage() {
  return (
    <AdminGuard>
      <AdminDashboardContent />
    </AdminGuard>
  )
}
