'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function InvitationBadge() {
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    let channel: ReturnType<typeof supabase.channel> | null = null

    const fetchCount = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setLoading(false)
        return
      }

      const { count: invitationCount, error } = await supabase
        .from('group_invitations')
        .select('*', { count: 'exact', head: true })
        .eq('invited_user_id', user.id)
        .eq('status', 'pending')

      if (!error && invitationCount !== null) {
        setCount(invitationCount)
      }
      setLoading(false)
    }

    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Set up real-time subscription for invitation updates
      // Filter to only listen for changes where invited_user_id matches current user
      // This prevents unnecessary refetches for invitations to other users
      channel = supabase
        .channel('user-invitations')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'group_invitations',
            filter: `invited_user_id=eq.${user.id}`,
          },
          () => {
            fetchCount()
          }
        )
        .subscribe()
    }

    fetchCount()
    setupSubscription()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [])

  if (loading || count === 0) {
    return null
  }

  return (
    <Link
      href="/groups/invitations"
      className="relative px-3 py-1.5 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors text-sm font-medium"
    >
      Invitations
      <span className="ml-1.5 px-2 py-0.5 bg-white text-purple-600 rounded-full text-xs font-bold">
        {count}
      </span>
    </Link>
  )
}
