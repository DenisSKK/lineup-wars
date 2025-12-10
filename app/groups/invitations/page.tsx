import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import HeaderNav from '@/components/HeaderNav'
import RespondToInvitation from '@/components/RespondToInvitation'

export const dynamic = 'force-dynamic'

export default async function InvitationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch all pending invitations for the current user
  const { data: invitations } = await supabase
    .from('group_invitations')
    .select(`
      *,
      group:groups(
        id,
        name,
        description,
        created_by
      ),
      inviter:invited_by(
        email,
        full_name
      )
    `)
    .eq('invited_user_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

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
              Your Invitations
            </h1>
            <p className="text-gray-600">
              Respond to group invitations you&apos;ve received
            </p>
          </div>

          {!invitations || invitations.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <p className="text-gray-600 mb-4">
                You don&apos;t have any pending invitations
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
              {invitations.map((invitation: any) => (
                <RespondToInvitation
                  key={invitation.id}
                  invitation={invitation}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
