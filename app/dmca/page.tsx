import Link from 'next/link'

export const metadata = {
  title: 'Copyright & DMCA Policy',
}

export default function DMCAPage() {
  return (
    <div className="min-h-screen bg-black text-gray-200">
      <header className="border-b border-gray-800 px-6 py-4">
        <Link href="/" className="text-amber-400 hover:text-amber-300 transition">
          ← Warren Media
        </Link>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-white mb-8">Copyright & DMCA Policy</h1>
        <div className="prose prose-invert prose-sm max-w-none space-y-6">
          <p>
            Warren Media respects the intellectual property rights of others and expects users and creators to do the same.
          </p>
          <p>
            If you believe that content available on Warren Media infringes upon your copyright, you may submit a written notice under the Digital Millennium Copyright Act (DMCA).
          </p>

          <section>
            <h2 className="text-xl font-semibold text-white mt-8 mb-2">Submit DMCA notices to</h2>
            <p>
              <a href="mailto:dmca@warrenmedia.tv" className="text-amber-400 hover:underline">dmca@warrenmedia.tv</a>
              <br />
              or <a href="mailto:copyright@warrenmedia.tv" className="text-amber-400 hover:underline">copyright@warrenmedia.tv</a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mt-8 mb-2">Your notice must include</h2>
            <ul className="list-decimal list-inside space-y-2 ml-2">
              <li>A physical or electronic signature of the copyright owner or authorized representative.</li>
              <li>Identification of the copyrighted work claimed to be infringed.</li>
              <li>Identification of the material that is claimed to be infringing and information reasonably sufficient to locate the material (URL or title).</li>
              <li>Your contact information (name, address, email, phone number).</li>
              <li>A statement that you have a good faith belief that the use is not authorized by the copyright owner, its agent, or the law.</li>
              <li>A statement that the information in the notification is accurate and, under penalty of perjury, that you are authorized to act on behalf of the copyright owner.</li>
            </ul>
          </section>
        </div>
      </main>
    </div>
  )
}
