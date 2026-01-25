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
    try {
      const user = await getCurrentUser()
      
      if (!user) {
        // Not logged in - redirect to homepage
        console.warn('Admin access denied: Not authenticated')
        router.push('/?error=admin_login_required')
        return
      }

      setIsAuthenticated(true)

      // Check if user is admin
      const adminStatus = await isAdmin(user.id)
      
      if (!adminStatus) {
        // Logged in but not admin - redirect with error
        console.warn('Admin access denied: User is not an admin', user.id)
        router.push('/?error=admin_access_denied')
        return
      }

      setIsAdminUser(true)
    } catch (error) {
      console.error('Error checking admin auth:', error)
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

