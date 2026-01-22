'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { signOut, getCurrentUser, onAuthStateChange } from '../lib/supabaseClient'
import AuthModal from './AuthModal'

export default function Header() {
  const [user, setUser] = useState<any>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial user
    getCurrentUser().then((user) => {
      setUser(user)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = onAuthStateChange((user) => {
      setUser(user)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const handleSignOut = async () => {
    await signOut()
    setUser(null)
  }

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center justify-between px-8 py-6">
          <a href="/" className="text-2xl font-bold">
            Warren Media
          </a>

          <div className="flex items-center gap-4">
            {!loading && (
              <>
                {user ? (
                  <>
                    <span className="text-sm text-gray-400">{user.email}</span>
                    <Link
                      href="/creator"
                      className="px-4 py-2 rounded-lg bg-amber-glow hover:bg-amber-600 transition text-black font-semibold"
                    >
                      Creator Space
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition"
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="px-4 py-2 rounded-lg bg-amber-glow hover:bg-amber-600 transition glow-amber"
                  >
                    Sign In
                  </button>
                )}
              </>
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

