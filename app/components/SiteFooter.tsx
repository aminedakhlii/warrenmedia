import Link from 'next/link'

export default function SiteFooter() {
  const linkClass =
    'text-xs text-gray-500 hover:text-gray-300 transition underline-offset-2 hover:underline'

  return (
    <footer className="border-t border-gray-800/80 bg-black px-6 py-8">
      <nav
        className="max-w-5xl mx-auto flex flex-wrap items-center justify-center gap-x-6 gap-y-3"
        aria-label="Site information"
      >
        <Link href="/about" className={linkClass}>
          About Warren Media
        </Link>
        <Link href="/privacy" className={linkClass}>
          Privacy
        </Link>
        <Link href="/contact" className={linkClass}>
          Contact
        </Link>
        <Link href="/dmca" className={linkClass}>
          Copyright &amp; DMCA
        </Link>
        <Link href="/creator" className={linkClass}>
          Creators
        </Link>
        <Link href="/music" className={linkClass}>
          Music TV
        </Link>
      </nav>
      <p className="text-center text-[11px] text-gray-600 mt-4">
        © {new Date().getFullYear()} Warren Media. All rights reserved.
      </p>
    </footer>
  )
}
