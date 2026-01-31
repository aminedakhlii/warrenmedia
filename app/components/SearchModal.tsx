'use client'

import { useState, useEffect } from 'react'
import { supabase, type Title } from '../lib/supabaseClient'

interface SearchModalProps {
  onClose: () => void
  onSelectTitle: (title: Title) => void
}

export default function SearchModal({ onClose, onSelectTitle }: SearchModalProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Title[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length >= 2) {
        searchTitles()
      } else {
        setResults([])
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  async function searchTitles() {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('titles')
        .select('*')
        .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
        .limit(20)

      if (data) {
        setResults(data)
      }
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = (title: Title) => {
    onSelectTitle(title)
    onClose()
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 pt-20"
      onClick={onClose}
    >
      <div 
        className="bg-gray-900 rounded-lg w-full max-w-3xl mx-4 border border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="p-6 border-b border-gray-800">
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title or description..."
              autoFocus
              className="w-full px-12 py-4 bg-gray-800 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-amber-glow"
            />
            <svg 
              className="absolute left-4 top-1/2 transform -translate-y-1/2 w-6 h-6 text-gray-400"
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {loading && (
            <div className="p-8 text-center text-gray-400">Searching...</div>
          )}
          
          {!loading && query.length < 2 && (
            <div className="p-8 text-center text-gray-400">
              Type at least 2 characters to search
            </div>
          )}

          {!loading && query.length >= 2 && results.length === 0 && (
            <div className="p-8 text-center text-gray-400">
              No results found for "{query}"
            </div>
          )}

          {results.length > 0 && (
            <div className="p-4 space-y-2">
              {results.map((title) => (
                <button
                  key={title.id}
                  onClick={() => handleSelect(title)}
                  className="w-full flex items-center gap-4 p-3 rounded-lg hover:bg-gray-800 transition text-left"
                >
                  <img 
                    src={title.poster_url} 
                    alt={title.title}
                    className="w-16 h-24 object-cover rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg mb-1">{title.title}</h3>
                    {title.description && (
                      <p className="text-sm text-gray-400 line-clamp-2">
                        {title.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs px-2 py-1 rounded bg-amber-glow/20 text-amber-400">
                        {title.content_type}
                      </span>
                      {title.runtime_seconds && (
                        <span className="text-xs text-gray-500">
                          {Math.floor(title.runtime_seconds / 60)} min
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
