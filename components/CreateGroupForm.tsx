'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface CreateGroupFormProps {
  userId: string
}

export default function CreateGroupForm({ userId }: CreateGroupFormProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      // Create group
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .insert({
          name,
          description,
          created_by: userId,
        })
        .select()
        .single()

      if (groupError) {
        setError(groupError.message)
        setIsLoading(false)
        return
      }

      // Add creator as member
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({
          group_id: group.id,
          user_id: userId,
        })

      if (memberError) {
        setError(memberError.message)
        setIsLoading(false)
        return
      }

      // Reset form and refresh
      setName('')
      setDescription('')
      router.refresh()
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="groupName" className="block text-sm font-medium text-gray-700 mb-1">
          Group Name
        </label>
        <input
          id="groupName"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
          placeholder="My Festival Group"
        />
      </div>

      <div>
        <label htmlFor="groupDescription" className="block text-sm font-medium text-gray-700 mb-1">
          Description (optional)
        </label>
        <textarea
          id="groupDescription"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
          placeholder="Compare our favorite festivals..."
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? 'Creating...' : 'Create Group'}
      </button>
    </form>
  )
}
