'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Props {
  invitationId: string
}

export default function RequestToJoinButton({ invitationId }: Props) {
  const [requesting, setRequesting] = useState(false)
  const router = useRouter()

  const handleRequest = async () => {
    setRequesting(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('group_invitations')
        .update({ status: 'requested' })
        .eq('id', invitationId)

      if (error) throw error

      alert('Request sent! The group creator will be notified.')
      router.refresh()
    } catch (error) {
      console.error('Request error:', error)
      alert('Failed to send request')
      setRequesting(false)
    }
  }

  return (
    <button
      onClick={handleRequest}
      disabled={requesting}
      className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 font-medium"
    >
      {requesting ? 'Sending Request...' : 'Request to Join'}
    </button>
  )
}
