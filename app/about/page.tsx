import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'About Warren Media',
  description:
    'Learn about Warren Media streaming—films, series, music videos, creators, and how we present content to viewers.',
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-black text-gray-200">
      <header className="fixed top-0 left-0 right-0 z-40 border-b border-gray-800 bg-black/95 px-6 py-4">
        <Link href="/" className="text-amber-400 hover:text-amber-300 transition">
          ← Warren Media
        </Link>
      </header>
      <main className="max-w-3xl mx-auto px-6 pt-24 pb-16">
        <h1 className="text-3xl font-bold text-white mb-8">About Warren Media</h1>
        <article className="space-y-5 text-sm md:text-base leading-relaxed">
          <p>
            Warren Media is an on-demand streaming service focused on delivering films, serialized programming,
            music videos, and audio podcasts in a single, cinema-inspired experience. We believe discovery should
            feel intentional: curated rows, featured titles, and playback that respects the work behind each
            title.
          </p>
          <p>
            Our catalog combines licensed studio and independent titles with original and partner content. Viewers
            can browse by mood and category—trending picks, new releases, music videos, and more—and open any
            title in a dedicated theater view with progress saving for signed-in users.
          </p>
          <p>
            We operate a creator program for approved partners who agree to our upload and licensing terms.
            Creators can manage their submissions through a dedicated portal after application review. This helps
            us keep the platform aligned with rights holders and audience expectations.
          </p>
          <p>
            Warren Media Music is our 24/7 music video channel: a programmed playlist designed for continuous
            viewing, separate from the main on-demand catalog but connected to the same standards for rights
            and quality.
          </p>
          <p>
            Questions about policies, privacy, or partnerships are welcome. Please use the{' '}
            <Link href="/contact" className="text-amber-400 hover:underline">
              Contact
            </Link>{' '}
            page for the best way to reach us, or review{' '}
            <Link href="/privacy" className="text-amber-400 hover:underline">
              Privacy
            </Link>{' '}
            and{' '}
            <Link href="/dmca" className="text-amber-400 hover:underline">
              DMCA
            </Link>{' '}
            for legal topics.
          </p>
        </article>
      </main>
    </div>
  )
}
