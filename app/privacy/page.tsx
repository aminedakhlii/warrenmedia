import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy — Warren Media',
  description: 'How Warren Media handles information when you use our streaming platform and related services.',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-black text-gray-200">
      <header className="fixed top-0 left-0 right-0 z-40 border-b border-gray-800 bg-black/95 px-6 py-4">
        <Link href="/" className="text-amber-400 hover:text-amber-300 transition">
          ← Warren Media
        </Link>
      </header>
      <main className="max-w-3xl mx-auto px-6 pt-24 pb-16">
        <h1 className="text-3xl font-bold text-white mb-8">Privacy Policy</h1>
        <p className="text-xs text-gray-500 mb-8">Last updated: March 2026</p>
        <article className="space-y-5 text-sm md:text-base leading-relaxed">
          <p>
            Warren Media (“we,” “us”) operates this website and streaming experience. This policy describes,
            at a high level, how we approach privacy. For product-specific details tied to authentication or
            analytics, refer to any in-product notices and your account settings when logged in.
          </p>
          <h2 className="text-xl font-semibold text-white pt-4">Information you provide</h2>
          <p>
            When you create an account, we process the information you submit—such as email address—for
            sign-in, security, and support. If you contact us through the contact page or support channels, we
            use that information to respond to your request.
          </p>
          <h2 className="text-xl font-semibold text-white pt-4">Usage and playback</h2>
          <p>
            We may process technical data needed to deliver video and audio (for example, device type, rough
            region, or playback diagnostics) to keep the service reliable. Where we offer optional features such
            as continue watching, we associate playback progress with your account when you are signed in.
          </p>
          <h2 className="text-xl font-semibold text-white pt-4">Cookies and third parties</h2>
          <p>
            We may use cookies or similar technologies for session management, preferences, or measurement.
            Third-party services (for example, video hosting or advertising partners) may set their own cookies or
            collect data according to their policies. You can control many cookies through your browser
            settings.
          </p>
          <h2 className="text-xl font-semibold text-white pt-4">Retention and security</h2>
          <p>
            We retain information only as long as needed for the purposes described above or as required by
            law. We use reasonable safeguards designed to protect information; no method of transmission over the
            Internet is completely secure.
          </p>
          <h2 className="text-xl font-semibold text-white pt-4">Your choices</h2>
          <p>
            You may request access, correction, or deletion of certain account information where applicable law
            provides those rights. Contact us through the{' '}
            <Link href="/contact" className="text-amber-400 hover:underline">
              Contact
            </Link>{' '}
            page and we will respond as permitted by law.
          </p>
          <p className="text-gray-400 text-sm pt-4">
            This summary is not legal advice. We may update this page from time to time; the “last updated” date
            at the top will change when we do.
          </p>
        </article>
      </main>
    </div>
  )
}
