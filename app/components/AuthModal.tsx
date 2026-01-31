'use client'

import { useState } from 'react'
import { signIn, signUp } from '../lib/supabaseClient'

interface AuthModalProps {
  onClose: () => void
  onSuccess: () => void
}

export default function AuthModal({ onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showVerificationDialog, setShowVerificationDialog] = useState(false)
  const [verificationEmail, setVerificationEmail] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password)
        if (error) throw error
        onSuccess()
      } else {
        const { data, error } = await signUp(email, password)
        if (error) throw error
        
        // Check if email confirmation is required
        if (data?.user && !data.session) {
          setVerificationEmail(email)
          setShowVerificationDialog(true)
          onClose() // Close signup modal
        } else {
          // Auto-confirmed (if email confirmation is disabled)
          onSuccess()
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  if (showVerificationDialog) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
        <div className="bg-gray-900 rounded-lg p-8 max-w-md w-full mx-4 border-2 border-blue-600">
          <div className="text-center">
            <div className="text-6xl mb-4">📧</div>
            <h2 className="text-2xl font-bold mb-2 text-blue-400">Verify Your Email</h2>
            <p className="text-gray-300 mb-4">
              We sent a verification link to:
            </p>
            <p className="text-amber-400 font-semibold mb-6">{verificationEmail}</p>
            <p className="text-sm text-gray-400 mb-6">
              Click the link in the email to activate your account. You can close this window.
            </p>
            <button
              onClick={onClose}
              className="w-full px-6 py-3 bg-amber-glow hover:bg-amber-600 rounded-lg font-semibold transition text-black"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="bg-gray-900 rounded-lg p-8 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-800 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-glow"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-glow"
              required
              minLength={6}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-900/50 rounded-lg text-sm">{error}</div>
          )}

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
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          {mode === 'login' ? (
            <p>
              Don't have an account?{' '}
              <button
                onClick={() => setMode('signup')}
                className="text-amber-glow hover:underline"
              >
                Sign up
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{' '}
              <button
                onClick={() => setMode('login')}
                className="text-amber-glow hover:underline"
              >
                Sign in
              </button>
            </p>
          )}
        </div>

        <div className="mt-4 text-center text-xs text-gray-400">
          Continue as guest to browse without saving progress
        </div>
      </div>
    </div>
  )
}

