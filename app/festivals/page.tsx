import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Festival } from '@/lib/types/database'
import HeaderNav from '@/components/HeaderNav'

export const dynamic = 'force-dynamic'

export default async function FestivalsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch all festivals
  const { data: festivals, error: festivalsError } = await supabase
    .from('festivals')
    .select('*')
    .order('year', { ascending: false })

  // Fetch user's selected festivals
  const { data: userFestivals } = await supabase
    .from('user_festivals')
    .select('festival_id')
    .eq('user_id', user.id)

  const selectedFestivalIds = new Set(
    userFestivals?.map((uf: { festival_id: string }) => uf.festival_id) || []
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <HeaderNav active="festivals" />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Select Festivals to Rate
          </h1>
          <p className="text-gray-600">
            Choose festivals and rate bands from their lineups
          </p>
        </div>

        {festivalsError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            Error loading festivals. Please try again later.
          </div>
        )}

        {!festivals || festivals.length === 0 ? (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
            <p className="font-bold">No festivals available yet</p>
            <p className="text-sm mt-2">
              Festivals need to be added to the database. You can add them using the Supabase dashboard
              or by running SQL commands with the provided schema.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {festivals.map((festival: Festival) => {
              const isSelected = selectedFestivalIds.has(festival.id)
              return (
                <div
                  key={festival.id}
                  className={`bg-white rounded-lg shadow-md overflow-hidden transition-all ${
                    isSelected ? 'ring-2 ring-purple-500' : ''
                  }`}
                >
                  {festival.image_url && (
                    <div className="h-48 bg-gradient-to-br from-purple-400 to-pink-400">
                      {/* Placeholder for festival image */}
                    </div>
                  )}
                  {!festival.image_url && (
                    <div className="h-48 bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                      <span className="text-6xl">🎵</span>
                    </div>
                  )}
                  <div className="p-6">
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">
                      {festival.name}
                    </h2>
                    <p className="text-gray-600 mb-2">
                      {festival.year}
                      {festival.location && ` • ${festival.location}`}
                    </p>
                    {festival.description && (
                      <p className="text-gray-600 text-sm mb-4">
                        {festival.description}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <Link
                        href={`/festivals/${festival.id}`}
                        className="flex-1 bg-purple-600 text-white py-2 px-4 rounded text-center hover:bg-purple-700 transition-colors"
                      >
                        {isSelected ? 'View & Rate' : 'View Lineup'}
                      </Link>
                      {isSelected && (
                        <span className="px-3 py-2 bg-green-100 text-green-800 rounded font-medium text-sm">
                          ✓ Selected
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
