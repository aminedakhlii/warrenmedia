import Link from 'next/link'

/**
 * Visible editorial copy on the homepage so ad placements sit next to real publisher content.
 */
export default function HomeEditorialSection() {
  return (
    <section
      className="w-full px-4 md:px-8 lg:px-10 py-5 md:py-6 text-gray-400 border-b border-gray-800/60 text-xs md:text-sm leading-snug"
      aria-labelledby="home-about-heading"
    >
      <h1 id="home-about-heading" className="text-base md:text-lg font-semibold text-white mb-1.5">
        Warren Media — streaming films, series &amp; music videos
      </h1>
      <p className="mb-1.5">
        Curated rows (trending, new releases, originals, music videos), full-screen playback, and continue
        watching when you&apos;re signed in. Try{' '}
        <Link href="/music" className="text-amber-400/90 hover:underline">
          Music TV
        </Link>{' '}
        for a 24/7 playlist. Creators:{' '}
        <Link href="/creator" className="text-amber-400/90 hover:underline">
          apply here
        </Link>
        . Copyright notices:{' '}
        <Link href="/dmca" className="text-amber-400/90 hover:underline">
          DMCA
        </Link>
        .
      </p>
      <p className="text-[11px] md:text-xs text-gray-500 leading-snug">
        <Link href="/about" className="text-amber-400/90 hover:underline">
          About
        </Link>
        {' · '}
        <Link href="/privacy" className="text-amber-400/90 hover:underline">
          Privacy
        </Link>
        {' · '}
        <Link href="/contact" className="text-amber-400/90 hover:underline">
          Contact
        </Link>
      </p>
    </section>
  )
}
