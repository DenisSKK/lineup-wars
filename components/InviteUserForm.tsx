'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  email: string
  full_name: string | null
}

interface Props {
  groupId: string
}

export default function InviteUserForm({ groupId }: Props) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [inviting, setInviting] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    setMessage(null)
    const supabase = createClient()

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get existing members
      const { data: members } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', groupId)

      const memberIds = members?.map(m => m.user_id) || []

      // Get ALL invitations (any status) to avoid duplicate key errors
      const { data: invitations } = await supabase
        .from('group_invitations')
        .select('invited_user_id')
        .eq('group_id', groupId)

      const invitedIds = invitations?.map(i => i.invited_user_id) || []

      // Combine all IDs to exclude
      const excludeIds = [user.id, ...memberIds, ...invitedIds]

      // Search for users excluding current user, members, and anyone with existing invitations
      let query = supabase
        .from('profiles')
        .select('id, email, full_name')
        .or(`email.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%`)
        .limit(10)

      // Only add the exclusion filter if there are IDs to exclude
      if (excludeIds.length > 0) {
        query = query.not('id', 'in', `(${excludeIds.join(',')})`)
      }

      const { data: users, error } = await query

      if (error) throw error

      setSearchResults(users || [])
    } catch (error) {
      console.error('Search error:', error)
      setMessage({ type: 'error', text: 'Failed to search users' })
    } finally {
      setIsSearching(false)
    }
  }

  const handleInvite = async (userId: string) => {
    setInviting(userId)
    setMessage(null)
    const supabase = createClient()

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('group_invitations')
        .insert({
          group_id: groupId,
          invited_user_id: userId,
          invited_by: user.id,
          status: 'pending'
        })

      if (error) throw error

      setMessage({ type: 'success', text: 'Invitation sent successfully!' })
      setSearchResults(prev => prev.filter(u => u.id !== userId))
      router.refresh()
    } catch (error) {
      console.error('Invite error:', error)
      setMessage({ type: 'error', text: 'Failed to send invitation' })
    } finally {
      setInviting(null)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Invite Users</h2>

      <div className="mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search by name or email..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          <button
            onClick={handleSearch}
            disabled={isSearching}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`mb-4 p-3 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {searchResults.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-600 mb-2">Search Results:</h3>
          {searchResults.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div>
                <p className="font-medium text-gray-800">
                  {user.full_name || 'No name'}
                </p>
                <p className="text-sm text-gray-600">{user.email}</p>
              </div>
              <button
                onClick={() => handleInvite(user.id)}
                disabled={inviting === user.id}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 text-sm"
              >
                {inviting === user.id ? 'Inviting...' : 'Invite'}
              </button>
            </div>
          ))}
        </div>
      )}

      {searchQuery && !isSearching && searchResults.length === 0 && (
        <p className="text-gray-600 text-center py-4">No users found</p>
      )}
    </div>
  )
}
