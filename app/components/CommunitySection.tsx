'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

interface CreatorPost {
  id: string
  creator_id: string
  title_id: string | null
  content: string
  created_at: string
  creator: {
    user_id: string
    name: string
  }
  title?: {
    title: string
    poster_url: string
  }
}

export default function CommunitySection() {
  const [posts, setPosts] = useState<CreatorPost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPosts()
  }, [])

  async function fetchPosts() {
    try {
      const { data, error } = await supabase
        .from('creator_posts')
        .select(`
          *,
          creator:creators(user_id, name),
          title:titles(title, poster_url)
        `)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) {
        console.error('Error fetching community posts:', error)
      } else if (data) {
        console.log('Fetched community posts:', data)
        setPosts(data as any)
      }
    } catch (error) {
      console.error('Exception fetching community posts:', error)
    } finally {
      setLoading(false)
    }
  }

  function formatTime(dateString: string) {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 60) return `${diffMins}m`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h`
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d`
  }

  function getInitial(name: string) {
    return name?.charAt(0)?.toUpperCase() || 'U'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-400">Loading community...</div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <h2 className="text-2xl font-bold mb-6">Community</h2>
      
      <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
        {posts.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            No community updates yet
          </div>
        ) : (
          posts.map((post) => (
            <div
              key={post.id}
              className="bg-gray-900/50 rounded-lg p-4 hover:bg-gray-900/70 transition border border-gray-800"
            >
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center font-semibold flex-shrink-0">
                  {getInitial(post.creator?.name)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">
                      {post.creator?.name || 'Creator'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatTime(post.created_at)}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-300 break-words">
                    {post.content}
                  </p>

                  {post.title && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-amber-400">
                      <span>📽️</span>
                      <span className="truncate">{post.title.title}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(251, 191, 36, 0.3);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(251, 191, 36, 0.5);
        }
      `}</style>
    </div>
  )
}
