'use client'

import { useEffect, useRef } from 'react'

const DEFAULT_CLIENT = 'ca-pub-4211519601454484'

type Props = {
  /** AdSense ad unit slot ID (from AdSense UI). Set NEXT_PUBLIC_ADSENSE_SLOT_HOME / _MUSIC or pass slot prop. */
  slot?: string
  className?: string
  format?: 'auto' | 'horizontal' | 'rectangle'
}

declare global {
  interface Window {
    adsbygoogle?: Record<string, unknown>[]
  }
}

export default function AdSenseDisplay({ slot, className = '', format = 'auto' }: Props) {
  const insRef = useRef<HTMLElement>(null)
  const pushed = useRef(false)

  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? DEFAULT_CLIENT
  const resolvedSlot = slot ?? ''

  useEffect(() => {
    pushed.current = false
  }, [resolvedSlot])

  useEffect(() => {
    if (!resolvedSlot || !insRef.current || pushed.current) return
    try {
      window.adsbygoogle = window.adsbygoogle || []
      window.adsbygoogle.push({})
      pushed.current = true
    } catch {
      // Ad blockers or script not loaded
    }
  }, [resolvedSlot])

  if (!resolvedSlot) return null

  return (
    <div className={`flex justify-center w-full min-h-[90px] ${className}`}>
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{ display: 'block', minWidth: '320px', minHeight: '90px' }}
        data-ad-client={client}
        data-ad-slot={resolvedSlot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  )
}
