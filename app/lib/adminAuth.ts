/**
 * Admin Authentication & Authorization
 * Phase 5: Security Hardening
 * 
 * Provides utilities to protect admin routes and check admin status
 */

import { supabase, getCurrentUser } from './supabaseClient'

/**
 * Check if a user is an admin
 * @param userId - User UUID to check
 * @returns true if user is admin, false otherwise
 */
export async function isAdmin(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', userId)
      .single()

    if (error || !data) {
      return false
    }

    return true
  } catch (error) {
    console.error('Error checking admin status:', error)
    return false
  }
}

/**
 * Get current user and verify admin status
 * @returns Object with user and isAdmin flag, or null if not authenticated
 */
export async function requireAdmin(): Promise<{
  user: any
  isAdmin: boolean
} | null> {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return null
    }

    const adminStatus = await isAdmin(user.id)

    return {
      user,
      isAdmin: adminStatus,
    }
  } catch (error) {
    console.error('Error in requireAdmin:', error)
    return null
  }
}

/**
 * Hook for client-side admin protection
 * Use this in admin pages to check auth and redirect if not admin
 * 
 * @example
 * const { isAdmin, isLoading, user } = useAdminAuth()
 * if (isLoading) return <div>Loading...</div>
 * if (!isAdmin) return <div>Access Denied</div>
 */
export function useAdminAuthCheck() {
  // This will be used in admin pages
  // Returns { isAdmin, isLoading, user }
}

/**
 * Admin check for API routes (server-side)
 * @param request - NextRequest object
 * @returns Object with admin status and user, or throws error
 */
export async function checkAdminAPI(authHeader: string | null): Promise<{
  user: any
  isAdmin: boolean
}> {
  if (!authHeader) {
    throw new Error('Authentication required')
  }

  // Create authenticated supabase client
  const { createClient } = await import('@supabase/supabase-js')
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  
  const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  })

  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
  
  if (authError || !user) {
    throw new Error('Authentication failed')
  }

  // Check admin status
  const { data: adminData } = await supabaseAuth
    .from('admin_users')
    .select('user_id')
    .eq('user_id', user.id)
    .single()

  const adminStatus = !!adminData

  return {
    user,
    isAdmin: adminStatus,
  }
}

