import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Contact — Warren Media',
  description: 'How to reach Warren Media for general inquiries, creators, and legal notices.',
}

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-black text-gray-200">
      <header className="fixed top-0 left-0 right-0 z-40 border-b border-gray-800 bg-black/95 px-6 py-4">
        <Link href="/" className="text-amber-400 hover:text-amber-300 transition">
          ← Warren Media
        </Link>
      </header>
      <main className="max-w-3xl mx-auto px-6 pt-24 pb-16">
        <h1 className="text-3xl font-bold text-white mb-8">Contact</h1>
        <article className="space-y-5 text-sm md:text-base leading-relaxed">
          <p>
            We welcome questions about Warren Media, our catalog, and the creator program. Because volume varies,
            we may not respond to every message immediately, but we read legitimate inquiries regularly.
          </p>
          <h2 className="text-xl font-semibold text-white pt-4">General &amp; business</h2>
          <p>
            For general questions or partnership ideas, email{' '}
            <a href="mailto:hello@warrenmedia.tv" className="text-amber-400 hover:underline">
              hello@warrenmedia.tv
            </a>
            . Replace this address in the codebase if your production inbox differs.
          </p>
          <h2 className="text-xl font-semibold text-white pt-4">Creators</h2>
          <p>
            If you are interested in uploading as a creator, start with the{' '}
            <Link href="/creator" className="text-amber-400 hover:underline">
              creator portal
            </Link>
            . After you submit an application, our team reviews it and will contact you at the email on your
            account when there is an update.
          </p>
          <h2 className="text-xl font-semibold text-white pt-4">Copyright &amp; legal</h2>
          <p>
            For DMCA and copyright notices, use only the process described on our{' '}
            <Link href="/dmca" className="text-amber-400 hover:underline">
              Copyright &amp; DMCA policy
            </Link>{' '}
            page so notices include the required elements and reach the right mailbox.
          </p>
          <h2 className="text-xl font-semibold text-white pt-4">Privacy</h2>
          <p>
            For privacy-related requests, mention “Privacy request” in the subject line when you write to the
            general contact above, and include enough detail for us to verify and fulfill your request where the
            law applies. See also our{' '}
            <Link href="/privacy" className="text-amber-400 hover:underline">
              Privacy policy
            </Link>
            .
          </p>
        </article>
      </main>
    </div>
  )
}
