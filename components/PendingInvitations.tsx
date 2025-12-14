'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PendingInvitation } from '@/lib/types/groups'

interface Props {
  groupId: string
  initialInvitations: PendingInvitation[]
}

export default function PendingInvitations({ groupId, initialInvitations }: Props) {
  const [invitations, setInvitations] = useState(initialInvitations)
  const [canceling, setCanceling] = useState<string | null>(null)

  const handleCancel = async (invitationId: string) => {
    setCanceling(invitationId)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('group_invitations')
        .delete()
        .eq('id', invitationId)

      if (error) throw error

      setInvitations(prev => prev.filter(inv => inv.id !== invitationId))
    } catch (error) {
      console.error('Cancel error:', error)
      alert('Failed to cancel invitation')
    } finally {
      setCanceling(null)
    }
  }

  if (invitations.length === 0) {
    return null
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Pending Invitations</h2>
      <div className="space-y-2">
        {invitations.map((invitation) => (
          <div
            key={invitation.id}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
          >
            <div>
              <p className="font-medium text-gray-800">
                {invitation.profile.full_name || 'No name'}
              </p>
              <p className="text-sm text-gray-600">{invitation.profile.email}</p>
              <p className="text-xs text-gray-500">
                Invited {new Date(invitation.created_at).toLocaleDateString()}
              </p>
            </div>
            <button
              onClick={() => handleCancel(invitation.id)}
              disabled={canceling === invitation.id}
              className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50 text-sm"
            >
              {canceling === invitation.id ? 'Canceling...' : 'Cancel'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
