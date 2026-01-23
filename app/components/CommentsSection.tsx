'use client'

import { useState, useEffect } from 'react'
import { supabase, getCurrentUser, type Comment, type CommentWithDetails, type ReactionType } from '../lib/supabaseClient'

interface CommentsSectionProps {
  titleId: string
  episodeId?: string
  isVisible: boolean // Controlled visibility - respects cinema-first
  onClose: () => void // Callback to close the panel
}

export default function CommentsSection({ titleId, episodeId, isVisible, onClose }: CommentsSectionProps) {
  const [user, setUser] = useState<any>(null)
  const [comments, setComments] = useState<CommentWithDetails[]>([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (isVisible) {
      init()
    }
  }, [titleId, episodeId, isVisible])

  async function init() {
    try {
      const currentUser = await getCurrentUser()
      setUser(currentUser)
      
      await fetchComments()
    } catch (error) {
      console.error('Error initializing comments:', error)
    }
  }

  // Helper to get auth headers
  async function getAuthHeaders() {
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    }
  }

  async function fetchComments() {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        titleId,
        ...(episodeId && { episodeId }),
        ...(user && { userId: user.id }),
      })

      const response = await fetch(`/api/comments?${params}`)
      const data = await response.json()

      if (response.ok) {
        setComments(data.comments || [])
      }
    } catch (error) {
      console.error('Error fetching comments:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmitComment(e: React.FormEvent) {
    e.preventDefault()
    
    if (!user) {
      setMessage('Please sign in to comment')
      return
    }

    if (!newComment.trim()) {
      setMessage('Comment cannot be empty')
      return
    }

    setSubmitting(true)
    setMessage('')

    try {
      const headers = await getAuthHeaders()

      const response = await fetch('/api/comments', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          titleId,
          episodeId: episodeId || null,
          content: newComment,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to post comment')
      }

      setNewComment('')
      setMessage('Comment posted!')
      setTimeout(() => setMessage(''), 2000)
      await fetchComments()
    } catch (error) {
      setMessage((error as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleReaction(commentId: string, reactionType: ReactionType) {
    if (!user) {
      setMessage('Please sign in to react')
      return
    }

    try {
      const headers = await getAuthHeaders()
      
      const response = await fetch('/api/comments/react', {
        method: 'POST',
        headers,
        body: JSON.stringify({ commentId, reactionType }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to react')
      }

      await fetchComments()
    } catch (error) {
      setMessage((error as Error).message)
    }
  }

  async function handleDeleteComment(commentId: string) {
    if (!confirm('Delete this comment?')) return

    try {
      const headers = await getAuthHeaders()
      
      const response = await fetch(`/api/comments?id=${commentId}`, {
        method: 'DELETE',
        headers,
      })

      if (!response.ok) {
        throw new Error('Failed to delete comment')
      }

      await fetchComments()
    } catch (error) {
      setMessage((error as Error).message)
    }
  }

  async function handleReport(commentId: string) {
    const reason = prompt('Why are you reporting this comment?')
    if (!reason) return

    try {
      const headers = await getAuthHeaders()
      
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          contentType: 'comment',
          contentId: commentId,
          reason,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to report')
      }

      setMessage('Report submitted. Thank you.')
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      setMessage((error as Error).message)
    }
  }

  if (!isVisible) {
    return null
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 bg-black/30">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-300">
          Comments {comments.length > 0 && `(${comments.length})`}
        </h3>
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition"
          aria-label="Close comments"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Post Comment Form */}
      {user ? (
        <form onSubmit={handleSubmitComment} className="mb-6">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()} // Prevent theater keyboard shortcuts
            placeholder="Share your thoughts..."
            className="w-full px-4 py-3 bg-gray-900/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-glow resize-none"
            rows={3}
            maxLength={1000}
            disabled={submitting}
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-500">
              {newComment.length}/1000
            </span>
            <button
              type="submit"
              disabled={submitting || !newComment.trim()}
              className="px-6 py-2 bg-amber-glow hover:bg-amber-600 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed text-black"
            >
              {submitting ? 'Posting...' : 'Post Comment'}
            </button>
          </div>
        </form>
      ) : (
        <div className="mb-6 p-4 bg-gray-900/80 rounded-lg text-center text-gray-400">
          <p>Sign in to join the conversation</p>
        </div>
      )}

      {/* Messages */}
      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${
          message.includes('Error') || message.includes('Failed') || message.includes('exceeded')
            ? 'bg-red-900/50 text-red-300'
            : 'bg-green-900/50 text-green-300'
        }`}>
          {message}
        </div>
      )}

      {/* Comments List */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading comments...</div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No comments yet. Be the first to share your thoughts!
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentUserId={user?.id}
              onReaction={handleReaction}
              onDelete={handleDeleteComment}
              onReport={handleReport}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Comment Item Component
interface CommentItemProps {
  comment: CommentWithDetails
  currentUserId?: string
  onReaction: (commentId: string, reactionType: ReactionType) => void
  onDelete: (commentId: string) => void
  onReport: (commentId: string) => void
}

function CommentItem({ comment, currentUserId, onReaction, onDelete, onReport }: CommentItemProps) {
  const [showActions, setShowActions] = useState(false)
  const isOwnComment = currentUserId === comment.user_id

  const reactions = [
    { type: 'like' as ReactionType, emoji: '👍', count: comment.like_count },
    { type: 'love' as ReactionType, emoji: '❤️', count: comment.love_count },
    { type: 'laugh' as ReactionType, emoji: '😂', count: comment.laugh_count },
  ]

  return (
    <div className="bg-gray-900/60 rounded-lg p-4 hover:bg-gray-900/80 transition">
      <div className="flex items-start justify-between mb-2">
        <div>
          <span className="font-semibold text-sm text-gray-300">
            {comment.user_email}
          </span>
          <span className="text-xs text-gray-500 ml-2">
            {new Date(comment.created_at).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </span>
        </div>
        <button
          onClick={() => setShowActions(!showActions)}
          className="text-gray-500 hover:text-gray-300 transition"
        >
          ⋮
        </button>
      </div>

      <p className="text-gray-200 mb-3 whitespace-pre-wrap">{comment.content}</p>

      {/* Reactions */}
      <div className="flex items-center gap-2 flex-wrap">
        {reactions.map((reaction) => (
          <button
            key={reaction.type}
            onClick={() => onReaction(comment.id, reaction.type)}
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition ${
              (comment as any).user_reaction === reaction.type
                ? 'bg-amber-glow/20 text-amber-400 border border-amber-glow'
                : 'bg-gray-800 hover:bg-gray-700 text-gray-400'
            }`}
            disabled={!currentUserId}
          >
            <span>{reaction.emoji}</span>
            {reaction.count > 0 && <span>{reaction.count}</span>}
          </button>
        ))}
      </div>

      {/* Actions Dropdown */}
      {showActions && (
        <div className="mt-3 flex gap-2">
          {isOwnComment ? (
            <button
              onClick={() => onDelete(comment.id)}
              className="text-xs text-red-400 hover:text-red-300 transition"
            >
              Delete
            </button>
          ) : currentUserId ? (
            <button
              onClick={() => onReport(comment.id)}
              className="text-xs text-amber-400 hover:text-amber-300 transition"
            >
              Report
            </button>
          ) : null}
        </div>
      )}
    </div>
  )
}

