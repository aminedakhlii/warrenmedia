'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import type { Title } from '../lib/supabaseClient'

interface RowSliderProps {
  title: string
  titles: Title[]
  onTitleClick: (title: Title) => void
  initialFocusIndex?: number
  isKeyboardNavigating?: boolean
}

export default function RowSlider({
  title,
  titles,
  onTitleClick,
  initialFocusIndex = -1,
  isKeyboardNavigating = false,
}: RowSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [focusedIndex, setFocusedIndex] = useState(initialFocusIndex)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)
  const [velocity, setVelocity] = useState(0)
  const [lastX, setLastX] = useState(0)
  const [lastTime, setLastTime] = useState(0)
  const animationRef = useRef<number | undefined>(undefined)

  // Inertial scrolling with smooth deceleration
  useEffect(() => {
    if (Math.abs(velocity) > 0.1) {
      animationRef.current = requestAnimationFrame(() => {
        if (containerRef.current) {
          containerRef.current.scrollLeft += velocity
          setVelocity(velocity * 0.95) // Smooth deceleration
        }
      })
    } else {
      setVelocity(0)
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [velocity])

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return
    setIsDragging(true)
    setStartX(e.pageX - containerRef.current.offsetLeft)
    setScrollLeft(containerRef.current.scrollLeft)
    setLastX(e.pageX)
    setLastTime(Date.now())
    setVelocity(0)
    containerRef.current.style.cursor = 'grabbing'
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return
    e.preventDefault()
    const x = e.pageX - containerRef.current.offsetLeft
    const walk = (x - startX) * 1.5 // Scroll speed multiplier
    containerRef.current.scrollLeft = scrollLeft - walk

    // Calculate velocity for inertia
    const now = Date.now()
    const dt = now - lastTime
    if (dt > 0) {
      const dx = e.pageX - lastX
      setVelocity(-(dx / dt) * 16) // Convert to pixels per frame (60fps)
    }
    setLastX(e.pageX)
    setLastTime(now)
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    if (containerRef.current) {
      containerRef.current.style.cursor = 'grab'
    }
  }

  const handleMouseLeave = () => {
    if (isDragging) {
      setIsDragging(false)
      if (containerRef.current) {
        containerRef.current.style.cursor = 'grab'
      }
    }
  }

  // Wheel handler
  const handleWheel = (e: React.WheelEvent) => {
    if (!containerRef.current) return
    e.preventDefault()
    containerRef.current.scrollLeft += e.deltaY
    setVelocity(0)
  }

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && focusedIndex > 0) {
        e.preventDefault()
        setFocusedIndex(focusedIndex - 1)
      } else if (e.key === 'ArrowRight' && focusedIndex < titles.length - 1) {
        e.preventDefault()
        setFocusedIndex(focusedIndex + 1)
      } else if (e.key === 'Enter' && focusedIndex >= 0) {
        e.preventDefault()
        onTitleClick(titles[focusedIndex])
      }
    },
    [focusedIndex, titles, onTitleClick]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Scroll focused tile into view
  useEffect(() => {
    if (focusedIndex >= 0 && containerRef.current && contentRef.current) {
      const container = containerRef.current
      const tiles = contentRef.current.children
      if (tiles[focusedIndex]) {
        const tile = tiles[focusedIndex] as HTMLElement
        const containerRect = container.getBoundingClientRect()
        const tileRect = tile.getBoundingClientRect()

        // Calculate if tile is out of view
        const tileLeft = tile.offsetLeft
        const tileRight = tileLeft + tile.offsetWidth
        const scrollLeft = container.scrollLeft
        const scrollRight = scrollLeft + container.offsetWidth

        if (tileLeft < scrollLeft) {
          // Tile is to the left, scroll left
          container.scrollTo({ left: tileLeft - 20, behavior: 'smooth' })
        } else if (tileRight > scrollRight) {
          // Tile is to the right, scroll right
          container.scrollTo({ left: tileRight - container.offsetWidth + 20, behavior: 'smooth' })
        }
      }
    }
  }, [focusedIndex])

  return (
    <div className="mb-10">
      <h2 className="text-base font-semibold mb-3 px-8 text-glow">{title}</h2>
      <div
        ref={containerRef}
        className="overflow-x-scroll overflow-y-hidden scrollbar-hide cursor-grab select-none px-8"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
      >
        <div ref={contentRef} className="flex gap-4" style={{ width: 'max-content' }}>
          {titles.map((titleItem, index) => (
            <div
              key={titleItem.id}
              className={`
                relative flex-shrink-0 w-[240px] h-[360px] rounded-lg overflow-hidden
                transition-all duration-300 cursor-pointer
                ${
                  focusedIndex === index
                    ? isKeyboardNavigating
                      ? 'glow-amber-strong scale-105'
                      : 'glow-amber scale-105'
                    : 'hover:scale-105 hover:glow-amber'
                }
              `}
              onClick={() => {
                if (!isDragging) {
                  setFocusedIndex(index)
                  onTitleClick(titleItem)
                }
              }}
              onMouseEnter={() => !isDragging && setFocusedIndex(-1)}
              tabIndex={focusedIndex === index ? 0 : -1}
            >
              <Image
                src={titleItem.poster_url}
                alt={titleItem.title}
                fill
                sizes="240px"
                className="object-cover"
                draggable={false}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

