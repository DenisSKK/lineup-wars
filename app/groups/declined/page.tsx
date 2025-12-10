import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import HeaderNav from '@/components/HeaderNav'
import RequestToJoinButton from '@/components/RequestToJoinButton'

export const dynamic = 'force-dynamic'

export default async function DeclinedInvitationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch all declined invitations for the current user
  const { data: declinedInvitations } = await supabase
    .from('group_invitations')
    .select(`
      *,
      group:groups(
        id,
        name,
        description
      )
    `)
    .eq('invited_user_id', user.id)
    .eq('status', 'declined')
    .order('updated_at', { ascending: false })

  return (
    <div className="min-h-screen bg-gray-50">
      <HeaderNav active="groups" />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <Link
              href="/groups"
              className="text-purple-600 hover:text-purple-700 mb-4 inline-block"
            >
              ← Back to Groups
            </Link>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              Declined Invitations
            </h1>
            <p className="text-gray-600">
              Changed your mind? Request to join groups you previously declined
            </p>
          </div>

          {!declinedInvitations || declinedInvitations.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <p className="text-gray-600 mb-4">
                You haven&apos;t declined any group invitations
              </p>
              <Link
                href="/groups"
                className="inline-block px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Go to Groups
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {declinedInvitations.map((invitation: any) => (
                <div key={invitation.id} className="bg-white rounded-lg shadow-md p-6">
                  <div className="mb-4">
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">
                      {invitation.group.name}
                    </h2>
                    {invitation.group.description && (
                      <p className="text-gray-600 mb-2">{invitation.group.description}</p>
                    )}
                    <p className="text-sm text-gray-500">
                      Declined on {new Date(invitation.updated_at).toLocaleDateString()}
                    </p>
                  </div>

                  <RequestToJoinButton invitationId={invitation.id} />
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
