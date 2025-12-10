'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function InvitationBadge() {
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCount = async () => {
      const supabase = createClient()
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

    fetchCount()

    // Set up real-time subscription for invitation updates
    const supabase = createClient()
    const channel = supabase
      .channel('invitations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'group_invitations',
        },
        () => {
          fetchCount()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
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
