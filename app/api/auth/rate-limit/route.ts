/**
 * Auth Rate Limiting API
 * Phase 5: Security Hardening
 * 
 * Prevents brute force attacks on authentication endpoints
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabaseClient'

// Rate limit configuration
const AUTH_RATE_LIMIT = 5 // Max 5 attempts
const RATE_LIMIT_WINDOW_MINUTES = 15 // Per 15 minutes
const LOCKOUT_DURATION_MINUTES = 30 // Lockout for 30 minutes after exceeding

/**
 * Check if IP or email is rate limited for auth attempts
 * @param identifier - IP address or email
 * @returns true if within limit, false if exceeded
 */
export async function checkAuthRateLimit(identifier: string): Promise<boolean> {
  try {
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000)

    // Count recent auth attempts
    const { data: attempts, error } = await supabase
      .from('rate_limit_events')
      .select('id')
      .eq('action_type', 'auth_attempt')
      .gte('created_at', windowStart.toISOString())
      .ilike('user_id', identifier) // Using user_id field to store IP/email temporarily

    if (error) {
      console.error('Error checking auth rate limit:', error)
      return true // Allow on error to avoid blocking legitimate users
    }

    return (attempts?.length || 0) < AUTH_RATE_LIMIT
  } catch (error) {
    console.error('Error in checkAuthRateLimit:', error)
    return true
  }
}

/**
 * Log an auth attempt
 * @param identifier - IP address or email
 */
export async function logAuthAttempt(identifier: string): Promise<void> {
  try {
    await supabase.from('rate_limit_events').insert({
      user_id: identifier, // Temporarily using user_id for identifier
      action_type: 'auth_attempt',
    })
  } catch (error) {
    console.error('Error logging auth attempt:', error)
  }
}

/**
 * Get client IP from request
 * @param request - NextRequest
 * @returns IP address or 'unknown'
 */
export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const real = request.headers.get('x-real-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  if (real) {
    return real
  }
  
  return 'unknown'
}

// API endpoint to check rate limit status
export async function POST(request: NextRequest) {
  try {
    const { identifier } = await request.json()
    
    if (!identifier) {
      return NextResponse.json({ error: 'Identifier required' }, { status: 400 })
    }

    const withinLimit = await checkAuthRateLimit(identifier)

    return NextResponse.json({ 
      withinLimit,
      message: withinLimit 
        ? 'Within rate limit' 
        : `Too many attempts. Please try again in ${RATE_LIMIT_WINDOW_MINUTES} minutes.`
    })
  } catch (error) {
    console.error('Error in auth rate limit check:', error)
    return NextResponse.json(
      { error: 'Failed to check rate limit' },
      { status: 500 }
    )
  }
}

