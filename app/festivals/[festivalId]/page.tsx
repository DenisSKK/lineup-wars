import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import HeaderNav from '@/components/HeaderNav'
import BandRatingComponent from '@/components/BandRating'
import { LineupWithBand } from '@/lib/types/database'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{
    festivalId: string
  }>
}

export default async function FestivalDetailPage({ params }: Props) {
  const resolvedParams = await params
  const { festivalId } = resolvedParams
  
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch festival details
  const { data: festival } = await supabase
    .from('festivals')
    .select('*')
    .eq('id', festivalId)
    .single()

  if (!festival) {
    redirect('/festivals')
  }

  // Fetch lineup with bands
  const { data: lineups } = await supabase
    .from('lineups')
    .select(`
      *,
      band:bands(*)
    `)
    .eq('festival_id', festivalId)
    .order('day_number', { ascending: true, nullsFirst: false })

  // Fetch user's ratings for this festival
  const { data: userRatings } = await supabase
    .from('band_ratings')
    .select('*')
    .eq('user_id', user.id)
    .eq('festival_id', festivalId)

  const ratingsMap = new Map(
    userRatings?.map((rating: { band_id: string; rating: number }) => [rating.band_id, rating]) || []
  )

  // Add festival to user's selections if not already added
  const { data: userFestival } = await supabase
    .from('user_festivals')
    .select('id')
    .eq('user_id', user.id)
    .eq('festival_id', festivalId)
    .single()

  if (!userFestival) {
    await supabase.from('user_festivals').insert({
      user_id: user.id,
      festival_id: festivalId,
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <HeaderNav active="festivals" />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link
            href="/festivals"
            className="text-purple-600 hover:text-purple-700 mb-4 inline-block"
          >
            ← Back to Festivals
          </Link>
          <div className="bg-white rounded-lg shadow-md p-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              {festival.name}
            </h1>
            <p className="text-gray-600 text-lg">
              {festival.year}
              {festival.location && ` • ${festival.location}`}
            </p>
            {festival.description && (
              <p className="text-gray-600 mt-4">{festival.description}</p>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Rate the Lineup
          </h2>
          <p className="text-gray-600 mb-6">
            Rate each band from 1 (not interested) to 10 (must see!)
          </p>

          {!lineups || lineups.length === 0 ? (
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
              <p className="font-bold">No lineup available yet</p>
              <p className="text-sm mt-2">
                This festival doesn&apos;t have any bands in its lineup yet. Bands need to be added to the database.
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lineups.map((lineup: LineupWithBand) => (
                <BandRatingComponent
                  key={lineup.id}
                  band={lineup.band}
                  festivalId={festivalId}
                  userId={user.id}
                  initialRating={ratingsMap.get(lineup.band.id)?.rating}
                  lineup={lineup}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
