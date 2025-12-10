import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Festival } from '@/lib/types/database'
import HeaderNav from '@/components/HeaderNav'
import InviteUserForm from '@/components/InviteUserForm'
import PendingInvitations from '@/components/PendingInvitations'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{
    groupId: string
  }>
}

export default async function GroupDetailPage({ params }: Props) {
  const resolvedParams = await params
  const { groupId } = resolvedParams
  
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch group details
  const { data: group } = await supabase
    .from('groups')
    .select('*')
    .eq('id', groupId)
    .single()

  if (!group) {
    redirect('/groups')
  }

  // Check if user is a member
  const { data: membership } = await supabase
    .from('group_members')
    .select('*')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    redirect('/groups')
  }

  // Check if user is the group creator
  const isCreator = group.created_by === user.id

  // Fetch all group members with profiles
  const { data: members } = await supabase
    .from('group_members')
    .select(`
      *,
      profile:profiles(*)
    `)
    .eq('group_id', groupId)

  // Fetch pending invitations (only for creator)
  let pendingInvitations = []
  if (isCreator) {
    const { data } = await supabase
      .from('group_invitations')
      .select(`
        *,
        profile:invited_user_id(email, full_name)
      `)
      .eq('group_id', groupId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    pendingInvitations = data || []
  }

  // Fetch all festivals
  const { data: festivals } = await supabase
    .from('festivals')
    .select('*')
    .order('year', { ascending: false })

  // Fetch all ratings from group members
  const memberIds = members?.map((m: { user_id: string }) => m.user_id) || []
  const { data: allRatings } = await supabase
    .from('band_ratings')
    .select(`
      *,
      band:bands(*)
    `)
    .in('user_id', memberIds)

  // Calculate average ratings per festival
  const festivalRatings = new Map<string, {
    totalRating: number
    count: number
    bandRatings: Map<string, { total: number; count: number; bandName: string }>
  }>()

  allRatings?.forEach((rating: { festival_id: string; rating: number; band_id: string; band: { name: string } }) => {
    const festivalId = rating.festival_id
    if (!festivalRatings.has(festivalId)) {
      festivalRatings.set(festivalId, {
        totalRating: 0,
        count: 0,
        bandRatings: new Map(),
      })
    }

    const festivalData = festivalRatings.get(festivalId)!
    festivalData.totalRating += rating.rating
    festivalData.count += 1

    const bandId = rating.band_id
    if (!festivalData.bandRatings.has(bandId)) {
      festivalData.bandRatings.set(bandId, {
        total: 0,
        count: 0,
        bandName: rating.band.name,
      })
    }

    const bandData = festivalData.bandRatings.get(bandId)!
    bandData.total += rating.rating
    bandData.count += 1
  })

  // Sort festivals by average rating
  const sortedFestivals = (festivals || [])
    .map((festival: Festival) => {
      const ratings = festivalRatings.get(festival.id)
      const avgRating = ratings ? ratings.totalRating / ratings.count : 0
      return { ...festival, avgRating, ratingCount: ratings?.count || 0 }
    })
    .filter((f) => f.ratingCount > 0)
    .sort((a, b) => b.avgRating - a.avgRating)

  return (
    <div className="min-h-screen bg-gray-50">
      <HeaderNav active="groups" />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link
            href="/groups"
            className="text-purple-600 hover:text-purple-700 mb-4 inline-block"
          >
            ← Back to Groups
          </Link>
          <div className="bg-white rounded-lg shadow-md p-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              {group.name}
            </h1>
            {group.description && (
              <p className="text-gray-600 mb-4">{group.description}</p>
            )}
            <div className="flex items-center gap-2 text-gray-600">
              <span>👥</span>
              <span>{members?.length || 0} members</span>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Members</h2>
              <ul className="space-y-2">
                {members?.map((member: { id: string; user_id: string; profile: { full_name?: string; email: string } }) => (
                  <li key={member.id} className="flex items-center gap-2">
                    <span className="text-2xl">👤</span>
                    <div>
                      <p className="font-medium text-gray-800">
                        {member.profile.full_name || member.profile.email}
                      </p>
                      {member.user_id === group.created_by && (
                        <p className="text-xs text-purple-600">Creator</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {isCreator && (
              <>
                <InviteUserForm groupId={groupId} />
                <PendingInvitations groupId={groupId} initialInvitations={pendingInvitations} />
              </>
            )}
          </div>

          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Festival Rankings
            </h2>

            {sortedFestivals.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <p className="text-gray-600 mb-4">
                  No ratings yet in this group
                </p>
                <p className="text-sm text-gray-500">
                  Members need to rate bands from festivals to see rankings
                </p>
                <Link
                  href="/festivals"
                  className="inline-block mt-4 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Go Rate Festivals
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {sortedFestivals.map((festival: Festival & { avgRating: number; ratingCount: number }, index: number) => {
                  const festivalData = festivalRatings.get(festival.id)!
                  const topBands = Array.from(festivalData.bandRatings.entries())
                    .map(([bandId, data]) => ({
                      bandId,
                      bandName: data.bandName,
                      avgRating: data.total / data.count,
                    }))
                    .sort((a, b) => b.avgRating - a.avgRating)
                    .slice(0, 3)

                  return (
                    <div
                      key={festival.id}
                      className="bg-white rounded-lg shadow-md p-6"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-3">
                            <span className="text-3xl font-bold text-purple-600">
                              #{index + 1}
                            </span>
                            <div>
                              <h3 className="text-2xl font-bold text-gray-800">
                                {festival.name}
                              </h3>
                              <p className="text-gray-600">
                                {festival.year}
                                {festival.location && ` • ${festival.location}`}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-bold text-purple-600">
                            {festival.avgRating.toFixed(1)}
                          </div>
                          <p className="text-sm text-gray-600">
                            {festival.ratingCount} ratings
                          </p>
                        </div>
                      </div>

                      <div className="mt-4">
                        <h4 className="text-sm font-semibold text-gray-600 mb-2">
                          Top Rated Bands:
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {topBands.map((band) => (
                            <span
                              key={band.bandId}
                              className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
                            >
                              {band.bandName} ({band.avgRating.toFixed(1)})
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
