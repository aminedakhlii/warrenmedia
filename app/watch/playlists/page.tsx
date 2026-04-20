import Link from 'next/link'
import { getActivePlaylists } from '../../lib/supabaseClient'

export const metadata = {
  title: 'Playlists | Warren Media',
  description: 'Curated movie and music video playlists on Warren Media.',
}

export default async function PlaylistsIndexPage() {
  const playlists = await getActivePlaylists()

  return (
    <div className="min-h-screen bg-black text-gray-200">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-amber-400 hover:text-amber-300 text-sm">
          ← Warren Media
        </Link>
      </header>
      <main className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold text-white mb-2">Playlists</h1>
        <p className="text-sm text-gray-500 mb-8">
          Curated lists of films or music videos. Select a playlist to watch continuously—playback advances
          and loops automatically.
        </p>
        {playlists.length === 0 ? (
          <p className="text-gray-500 text-sm">No public playlists yet.</p>
        ) : (
          <ul className="space-y-2">
            {playlists.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/watch/playlists/${p.slug}`}
                  className="block px-4 py-3 rounded-lg border border-gray-800 bg-gray-950 hover:border-amber-500/40 hover:bg-gray-900/80 transition"
                >
                  <span className="font-medium text-white">{p.name}</span>
                  <span className="block text-xs text-gray-500 mt-1">
                    {p.playlist_type === 'movies' ? 'Movies' : 'Music videos'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
