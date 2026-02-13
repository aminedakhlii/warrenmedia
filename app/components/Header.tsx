'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { signOut, getCurrentUser, onAuthStateChange, supabase } from '../lib/supabaseClient'
import AuthModal from './AuthModal'

interface HeaderProps {
  onSearchClick?: () => void
}

export default function Header({ onSearchClick }: HeaderProps = {}) {
  const [user, setUser] = useState<any>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isCreator, setIsCreator] = useState(false)

  useEffect(() => {
    // Get initial user
    getCurrentUser().then((user) => {
      setUser(user)
      setLoading(false)
      if (user) {
        checkCreatorStatus(user.id)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = onAuthStateChange((user) => {
      setUser(user)
      if (user) {
        checkCreatorStatus(user.id)
      } else {
        setIsCreator(false)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  async function checkCreatorStatus(userId: string) {
    const { data } = await supabase
      .from('creators')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'approved')
      .maybeSingle()
    
    setIsCreator(!!data)
  }

  const handleSignOut = async () => {
    await signOut()
    setUser(null)
    setShowProfileDropdown(false)
    // Force page reload to update state everywhere
    window.location.href = '/'
  }

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 bg-black/95 backdrop-blur-sm">
        <div className="flex items-center justify-between px-8 py-4">
          <Link href="/" className="flex items-baseline gap-2.5 tracking-wider">
            {/* Mockup: prominent W in dark square, illuminated */}
            <span className="flex items-center justify-center w-11 h-11 rounded-md bg-gray-900/90 text-white text-2xl font-bold text-glow border border-white/40 shrink-0 shadow-lg">
              W
            </span>
            <span className="text-xl font-bold text-glow">Warren</span>
            <span className="text-sm font-medium text-white/90 align-baseline">MEDIA</span>
          </Link>

          <div className="flex items-center gap-3">
            {/* Search (mockup: search icon) */}
            {onSearchClick && (
              <button
                onClick={onSearchClick}
                className="w-9 h-9 rounded-full bg-gray-800/80 hover:bg-gray-700 flex items-center justify-center transition text-glow"
                title="Search"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            )}
            {/* Notifications (mockup: bell icon) */}
            <button
              className="w-9 h-9 rounded-full bg-gray-800/80 hover:bg-gray-700 flex items-center justify-center transition text-glow"
              title="Notifications"
              aria-label="Notifications"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>
            {/* Profile Dropdown */}
            {!loading && (
              <div className="relative">
                <button
                  onClick={() => {
                    if (user) {
                      setShowProfileDropdown(!showProfileDropdown)
                    } else {
                      setShowAuthModal(true)
                    }
                  }}
                  className="w-9 h-9 rounded-full bg-gray-800/80 hover:bg-gray-700 flex items-center justify-center transition text-glow"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {showProfileDropdown && user && (
                  <>
                    {/* Backdrop to close dropdown */}
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowProfileDropdown(false)}
                    />
                    
                    <div className="absolute right-0 mt-2 w-56 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50">
                      <div className="p-3 border-b border-gray-800">
                        <p className="text-sm text-gray-400 truncate">{user.email}</p>
                      </div>
                      
                      <div className="py-2">
                        <Link
                          href="/profile"
                          onClick={() => setShowProfileDropdown(false)}
                          className="flex items-center gap-3 px-4 py-2 hover:bg-gray-800 transition"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span>Profile</span>
                        </Link>

                        {isCreator && (
                          <Link
                            href="/creator"
                            onClick={() => setShowProfileDropdown(false)}
                            className="flex items-center gap-3 px-4 py-2 hover:bg-gray-800 transition text-amber-400"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            <span>Creator Space</span>
                          </Link>
                        )}

                        <button
                          onClick={handleSignOut}
                          className="flex items-center gap-3 px-4 py-2 hover:bg-gray-800 transition w-full text-left text-red-400"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => setShowAuthModal(false)}
        />
      )}
    </>
  )
}

