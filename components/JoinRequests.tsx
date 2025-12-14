'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { JoinRequest } from '@/lib/types/groups'

interface Props {
  groupId: string
  initialRequests: JoinRequest[]
}

export default function JoinRequests({ groupId, initialRequests }: Props) {
  const [requests, setRequests] = useState(initialRequests)
  const [responding, setResponding] = useState<string | null>(null)
  const router = useRouter()

  const handleResponse = async (requestId: string, action: 'approve' | 'deny') => {
    setResponding(requestId)
    const supabase = createClient()

    try {
      if (action === 'approve') {
        // Update status to accepted - trigger will add to group
        const { error } = await supabase
          .from('group_invitations')
          .update({ status: 'accepted' })
          .eq('id', requestId)

        if (error) throw error
      } else {
        // Delete the request
        const { error } = await supabase
          .from('group_invitations')
          .delete()
          .eq('id', requestId)

        if (error) throw error
      }

      setRequests(prev => prev.filter(req => req.id !== requestId))
      router.refresh()
    } catch (error) {
      console.error('Response error:', error)
      alert('Failed to respond to request')
    } finally {
      setResponding(null)
    }
  }

  if (requests.length === 0) {
    return null
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Join Requests</h2>
      <div className="space-y-2">
        {requests.map((request) => (
          <div
            key={request.id}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
          >
            <div>
              <p className="font-medium text-gray-800">
                {request.profile.full_name || 'No name'}
              </p>
              <p className="text-sm text-gray-600">{request.profile.email}</p>
              <p className="text-xs text-gray-500">
                Requested {new Date(request.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleResponse(request.id, 'approve')}
                disabled={responding === request.id}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 text-sm"
              >
                {responding === request.id ? 'Approving...' : 'Approve'}
              </button>
              <button
                onClick={() => handleResponse(request.id, 'deny')}
                disabled={responding === request.id}
                className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50 text-sm"
              >
                Deny
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
