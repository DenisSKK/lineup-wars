import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-red-500">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center text-white mb-12">
          <h1 className="text-6xl font-bold mb-4">🎸 Lineup Wars 🎸</h1>
          <p className="text-2xl mb-8">
            Compare festival lineups and decide which one rocks harder!
          </p>
          <p className="text-lg opacity-90 max-w-2xl mx-auto">
            Rate bands from different festivals individually, create groups with your friends,
            and see which festival wins based on your combined ratings.
          </p>
        </div>

        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-2xl p-8">
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="p-6 bg-purple-50 rounded-lg">
              <h2 className="text-2xl font-bold mb-3 text-purple-800">🎵 Rate Bands</h2>
              <p className="text-gray-700">
                Select festivals and rate each band from their lineup individually (1-10 scale).
              </p>
            </div>
            <div className="p-6 bg-pink-50 rounded-lg">
              <h2 className="text-2xl font-bold mb-3 text-pink-800">👥 Create Groups</h2>
              <p className="text-gray-700">
                Form groups with friends and compare your ratings to determine the ultimate festival winner.
              </p>
            </div>
          </div>

          <div className="text-center">
            {user ? (
              <div className="space-y-4">
                <p className="text-gray-600 mb-4">Welcome back! You&apos;re signed in as {user.email}</p>
                <div className="flex gap-4 justify-center flex-wrap">
                  <Link
                    href="/festivals"
                    className="px-8 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors"
                  >
                    Browse Festivals
                  </Link>
                  <Link
                    href="/groups"
                    className="px-8 py-3 bg-pink-600 text-white rounded-lg font-semibold hover:bg-pink-700 transition-colors"
                  >
                    My Groups
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-gray-600 mb-4">Get started by creating an account or signing in</p>
                <div className="flex gap-4 justify-center flex-wrap">
                  <Link
                    href="/signup"
                    className="px-8 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors"
                  >
                    Sign Up
                  </Link>
                  <Link
                    href="/login"
                    className="px-8 py-3 bg-white text-purple-600 border-2 border-purple-600 rounded-lg font-semibold hover:bg-purple-50 transition-colors"
                  >
                    Sign In
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-12 text-center text-white text-sm opacity-75">
          <p>In development for Rock For People vs. Nova Rock festivals</p>
        </div>
      </div>
    </div>
  )
}
