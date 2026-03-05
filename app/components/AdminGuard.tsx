'use client'

/**
 * AdminGuard Component
 * Phase 5: Security Hardening
 * 
 * Wraps admin pages to ensure only admins can access them
 * Redirects non-admins to homepage with error message
 */

import { useEffect, useState, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '../lib/supabaseClient'
import { isAdmin } from '../lib/adminAuth'

interface AdminGuardProps {
  children: ReactNode
}

export default function AdminGuard({ children }: AdminGuardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isAdminUser, setIsAdminUser] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    const log = (msg: string, obj?: unknown) => {
      console.log('[AdminGuard]', msg, obj !== undefined ? obj : '')
    }
    try {
      log('Fetching current user...')
      const user = await getCurrentUser()
      log('getCurrentUser result:', user ? { id: user.id, email: user.email } : null)

      if (!user) {
        log('Admin access denied: Not authenticated')
        router.push('/?error=admin_login_required')
        return
      }

      setIsAuthenticated(true)
      log('Calling isAdmin with user.id:', user.id)

      const adminStatus = await isAdmin(user.id)
      log('isAdmin result:', adminStatus)

      if (!adminStatus) {
        log('Admin access denied: isAdmin returned false for user.id:', user.id)
        router.push('/?error=admin_access_denied')
        return
      }

      log('Admin access granted')
      setIsAdminUser(true)
    } catch (error) {
      console.error('[AdminGuard] Error checking admin auth:', error)
      router.push('/?error=admin_check_failed')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-glow mx-auto mb-4"></div>
          <p className="text-gray-400">Verifying admin access...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !isAdminUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-gray-400">Redirecting...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

