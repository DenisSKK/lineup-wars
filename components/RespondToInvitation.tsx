'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Invitation {
  id: string
  group: {
    id: string
    name: string
    description: string | null
  }
  inviter: {
    email: string
    full_name: string | null
  }
  created_at: string
}

interface Props {
  invitation: Invitation
}

export default function RespondToInvitation({ invitation }: Props) {
  const [responding, setResponding] = useState<'accept' | 'decline' | null>(null)
  const router = useRouter()

  const handleResponse = async (status: 'accepted' | 'declined') => {
    setResponding(status === 'accepted' ? 'accept' : 'decline')
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('group_invitations')
        .update({ status })
        .eq('id', invitation.id)

      if (error) throw error

      if (status === 'accepted') {
        // Redirect to the group page
        router.push(`/groups/${invitation.group.id}`)
      } else {
        // Refresh the page to remove the declined invitation
        router.refresh()
      }
    } catch (error) {
      console.error('Response error:', error)
      alert('Failed to respond to invitation')
      setResponding(null)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          {invitation.group.name}
        </h2>
        {invitation.group.description && (
          <p className="text-gray-600 mb-2">{invitation.group.description}</p>
        )}
        <p className="text-sm text-gray-500">
          Invited by {invitation.inviter.full_name || invitation.inviter.email} •{' '}
          {new Date(invitation.created_at).toLocaleDateString()}
        </p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => handleResponse('accepted')}
          disabled={responding !== null}
          className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 font-medium"
        >
          {responding === 'accept' ? 'Accepting...' : 'Accept'}
        </button>
        <button
          onClick={() => handleResponse('declined')}
          disabled={responding !== null}
          className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 font-medium"
        >
          {responding === 'decline' ? 'Declining...' : 'Decline'}
        </button>
      </div>
    </div>
  )
}
