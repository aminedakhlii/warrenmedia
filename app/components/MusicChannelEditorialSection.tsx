import Link from 'next/link'

/**
 * Editorial copy for the Music TV page so display ads sit below real publisher content, not only the player UI.
 */
export default function MusicChannelEditorialSection() {
  return (
    <section
      className="w-full px-4 md:px-8 lg:px-10 py-8 text-gray-300 border-b border-gray-800/60"
      aria-labelledby="music-channel-about-heading"
    >
      <h1 id="music-channel-about-heading" className="text-xl md:text-2xl font-bold text-white mb-3">
        Warren Media Music — 24/7 music video channel
      </h1>
      <p className="mb-3 leading-relaxed text-sm md:text-base">
        Warren Media Music is our always-on music television experience. The channel plays an ordered playlist
        of music videos from our catalog, with a live-style presentation: you can watch full-screen, skip to
        the next video when the current one ends, and see what played recently. The playlist is curated by
        our team through the admin tools so viewers get a consistent broadcast feel.
      </p>
      <p className="mb-3 leading-relaxed text-sm md:text-base">
        Artists and labels who want their work considered for the channel can learn more through our main site
        and the{' '}
        <Link href="/creator" className="text-amber-400 hover:underline">
          creator program
        </Link>
        . All content on Warren Media must respect copyright and our community standards; unauthorized use of
        third-party sound recordings or visuals is not permitted.
      </p>
      <p className="leading-relaxed text-sm text-gray-400">
        For general information about Warren Media, visit the{' '}
        <Link href="/" className="text-amber-400 hover:underline">
          homepage
        </Link>
        . For legal notices including DMCA, see our{' '}
        <Link href="/dmca" className="text-amber-400 hover:underline">
          Copyright &amp; DMCA policy
        </Link>
        .
      </p>
    </section>
  )
}
