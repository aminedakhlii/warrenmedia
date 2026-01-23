'use client'

import { useState, useEffect } from 'react'
import { supabase, getCurrentUser, getFeatureFlag, type CreatorPost, type Creator } from '../lib/supabaseClient'

interface CreatorPostsProps {
  creatorId?: string
  titleId?: string
  readonly?: boolean
}

export default function CreatorPosts({ creatorId, titleId, readonly = false }: CreatorPostsProps) {
  const [enabled, setEnabled] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [creator, setCreator] = useState<Creator | null>(null)
  const [posts, setPosts] = useState<CreatorPost[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [message, setMessage] = useState('')

  const [postForm, setPostForm] = useState({
    content: '',
    imageUrl: '',
  })

  useEffect(() => {
    init()
  }, [creatorId, titleId])

  async function init() {
    try {
      const featureEnabled = await getFeatureFlag('enable_creator_posts')
      setEnabled(featureEnabled)

      if (!featureEnabled) {
        setLoading(false)
        return
      }

      const currentUser = await getCurrentUser()
      setUser(currentUser)

      // Check if current user is the creator (to show post button)
      if (currentUser && creatorId) {
        const { data: creatorData } = await supabase
          .from('creators')
          .select('*')
          .eq('id', creatorId)
          .eq('user_id', currentUser.id)
          .eq('status', 'approved')
          .single()
        
        setCreator(creatorData)
      }

      await fetchPosts()
    } catch (error) {
      console.error('Error initializing creator posts:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchPosts() {
    try {
      const params = new URLSearchParams()
      if (creatorId) params.append('creatorId', creatorId)
      if (titleId) params.append('titleId', titleId)

      const response = await fetch(`/api/creator-posts?${params}`)
      const data = await response.json()

      if (response.ok) {
        setPosts(data.posts || [])
      }
    } catch (error) {
      console.error('Error fetching posts:', error)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!user) {
      setMessage('Please sign in to post')
      return
    }

    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      if (!token) {
        throw new Error('No authentication token found')
      }

      const response = await fetch('/api/creator-posts', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: postForm.content,
          imageUrl: postForm.imageUrl || null,
          titleId: titleId || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create post')
      }

      setMessage('✅ Post created!')
      setPostForm({ content: '', imageUrl: '' })
      setShowForm(false)
      setTimeout(() => setMessage(''), 2000)
      await fetchPosts()
    } catch (error) {
      setMessage('❌ ' + (error as Error).message)
    }
  }

  if (!enabled) {
    return null
  }

  if (loading) {
    return null
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 bg-black/20 rounded-lg">
      {!readonly && (
        <>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-300">Creator Updates</h3>
            {creator && (
              <button
                onClick={() => setShowForm(!showForm)}
                className="px-4 py-2 bg-amber-glow hover:bg-amber-600 rounded-lg text-sm font-semibold transition text-black"
              >
                {showForm ? 'Cancel' : '+ New Post'}
              </button>
            )}
          </div>

          {message && (
            <div
              className={`mb-4 p-3 rounded-lg text-sm ${
                message.includes('❌') ? 'bg-red-900/50 text-red-300' : 'bg-green-900/50 text-green-300'
              }`}
            >
              {message}
            </div>
          )}
        </>
      )}

      {!readonly && showForm && (
        <form onSubmit={handleSubmit} className="mb-6 bg-gray-900/60 rounded-lg p-4">
          <textarea
            value={postForm.content}
            onChange={(e) => setPostForm({ ...postForm, content: e.target.value })}
            placeholder="Share an update with your audience..."
            className="w-full px-4 py-3 bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-glow resize-none mb-3"
            rows={4}
            maxLength={2000}
            required
          />
          <input
            type="url"
            value={postForm.imageUrl}
            onChange={(e) => setPostForm({ ...postForm, imageUrl: e.target.value })}
            placeholder="Image URL (optional)"
            className="w-full px-4 py-2 bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-glow mb-3"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">{postForm.content.length}/2000</span>
            <button
              type="submit"
              className="px-6 py-2 bg-amber-glow hover:bg-amber-600 rounded-lg font-semibold transition text-black"
            >
              Post Update
            </button>
          </div>
        </form>
      )}

      {posts.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No updates yet</div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <div key={post.id} className="bg-gray-900/60 rounded-lg p-4">
              <div className="mb-3">
                <span className="text-xs text-gray-500">
                  {new Date(post.created_at).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <p className="text-gray-200 whitespace-pre-wrap mb-3">{post.content}</p>
              {post.image_url && (
                <img
                  src={post.image_url}
                  alt="Post image"
                  className="w-full max-w-lg rounded-lg"
                  loading="lazy"
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

