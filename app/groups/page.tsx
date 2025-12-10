import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import HeaderNav from '@/components/HeaderNav'
import CreateGroupForm from '@/components/CreateGroupForm'
import { Group } from '@/lib/types/database'

export const dynamic = 'force-dynamic'

export default async function GroupsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch groups the user is a member of
  const { data: groupMembers } = await supabase
    .from('group_members')
    .select(`
      *,
      group:groups(*)
    `)
    .eq('user_id', user.id)

  // Fetch groups created by the user
  const { data: createdGroups } = await supabase
    .from('groups')
    .select(`
      *,
      group_members(count)
    `)
    .eq('created_by', user.id)

  const memberGroups = groupMembers?.map((gm: { group: Group }) => gm.group) || []
  const allGroups = [...(createdGroups || []), ...memberGroups]
  
  // Remove duplicates
  const uniqueGroups = Array.from(
    new Map(allGroups.map((group: Group) => [group.id, group])).values()
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <HeaderNav active="groups" />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">My Groups</h1>
          <p className="text-gray-600">
            Create groups with friends and compare festival ratings
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                Create New Group
              </h2>
              <CreateGroupForm userId={user.id} />
            </div>
          </div>

          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Your Groups
            </h2>
            
            {uniqueGroups.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <p className="text-gray-600 mb-4">
                  You haven&apos;t joined any groups yet
                </p>
                <p className="text-sm text-gray-500">
                  Create a new group to start comparing festival ratings with friends
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {uniqueGroups.map((group: Group & { group_members?: Array<{ count: number }> }) => (
                  <Link
                    key={group.id}
                    href={`/groups/${group.id}`}
                    className="block bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">
                          {group.name}
                        </h3>
                        {group.description && (
                          <p className="text-gray-600 mb-2">
                            {group.description}
                          </p>
                        )}
                        <p className="text-sm text-gray-500">
                          {group.created_by === user.id ? (
                            <span className="text-purple-600 font-semibold">
                              Created by you
                            </span>
                          ) : (
                            'Member'
                          )}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl">👥</span>
                        <p className="text-sm text-gray-600 mt-1">
                          {group.group_members?.[0]?.count || 0} members
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
