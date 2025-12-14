'use client'

import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

interface Member {
  id: string
  user_id: string
  profile: {
    full_name?: string
    email: string
  }
}

interface GroupMembersListProps {
  groupId: string
  groupOwnerId: string
  currentUserId: string
  initialMembers: Member[]
}

export default function GroupMembersList({
  groupId,
  groupOwnerId,
  currentUserId,
  initialMembers,
}: GroupMembersListProps) {
  const [members, setMembers] = useState<Member[]>(initialMembers)
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()
  const isOwner = currentUserId === groupOwnerId

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this member from the group?')) {
      return
    }

    setRemovingMemberId(userId)
    setError(null)

    try {
      const { data, error } = await supabase.rpc('remove_group_member', {
        p_group_id: groupId,
        p_user_id: userId,
      })

      if (error) throw error

      // Check if the function returned an error
      if (data && !data.success) {
        throw new Error(data.error)
      }

      // Remove the member from the UI
      setMembers(members.filter((m) => m.user_id !== userId))
    } catch (err) {
      console.error('Error removing member:', err)
      setError(err instanceof Error ? err.message : 'Failed to remove member')
    } finally {
      setRemovingMemberId(null)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Members</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <ul className="space-y-2">
        {members.map((member) => {
          const isMemberOwner = member.user_id === groupOwnerId
          const canRemove = isOwner && !isMemberOwner
          const isRemoving = removingMemberId === member.user_id

          return (
            <li
              key={member.id}
              className="flex items-center justify-between gap-2 py-2"
            >
              <div className="flex items-center gap-2">
                <span className="text-2xl">👤</span>
                <div>
                  <p className="font-medium text-gray-800">
                    {member.profile.full_name || member.profile.email}
                  </p>
                  {isMemberOwner && (
                    <p className="text-xs text-purple-600">Owner</p>
                  )}
                </div>
              </div>

              {canRemove && (
                <button
                  onClick={() => handleRemoveMember(member.user_id)}
                  disabled={isRemoving}
                  className="px-3 py-1 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Remove member"
                >
                  {isRemoving ? 'Removing...' : 'Remove'}
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
