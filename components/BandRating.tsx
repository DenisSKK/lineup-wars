'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Band, Lineup } from '@/lib/types/database'

interface BandRatingProps {
  band: Band
  festivalId: string
  userId: string
  initialRating?: number
  lineup: Lineup
}

export default function BandRatingComponent({
  band,
  festivalId,
  userId,
  initialRating,
  lineup,
}: BandRatingProps) {
  const [rating, setRating] = useState<number | undefined>(initialRating)
  const [hoveredRating, setHoveredRating] = useState<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const supabase = createClient()

  const handleRating = async (newRating: number) => {
    setIsSaving(true)
    try {
      if (rating) {
        // Update existing rating
        await supabase
          .from('band_ratings')
          .update({ rating: newRating })
          .eq('user_id', userId)
          .eq('band_id', band.id)
          .eq('festival_id', festivalId)
      } else {
        // Insert new rating
        await supabase.from('band_ratings').insert({
          user_id: userId,
          band_id: band.id,
          festival_id: festivalId,
          rating: newRating,
        })
      }
      setRating(newRating)
    } catch (error) {
      console.error('Error saving rating:', error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-4 hover:shadow-lg transition-shadow">
      <div className="mb-3">
        <h3 className="text-lg font-bold text-gray-800">{band.name}</h3>
        {band.genre && (
          <p className="text-sm text-gray-600">{band.genre}</p>
        )}
        {band.country && (
          <p className="text-xs text-gray-500">{band.country}</p>
        )}
        {lineup.day_number && (
          <p className="text-xs text-purple-600 mt-1">
            Day {lineup.day_number}
            {lineup.stage && ` • ${lineup.stage}`}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => {
            const isActive = hoveredRating ? value <= hoveredRating : value <= (rating || 0)
            return (
              <button
                key={value}
                onClick={() => handleRating(value)}
                onMouseEnter={() => setHoveredRating(value)}
                onMouseLeave={() => setHoveredRating(null)}
                disabled={isSaving}
                className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold transition-colors ${
                  isActive
                    ? value <= 3
                      ? 'bg-red-500 text-white'
                      : value <= 6
                      ? 'bg-yellow-500 text-white'
                      : 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                } ${isSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                title={`Rate ${value}/10`}
              >
                {value}
              </button>
            )
          })}
        </div>
      </div>

      {rating && (
        <div className="mt-2 text-center">
          <span className="text-sm font-semibold text-purple-600">
            Your rating: {rating}/10
          </span>
        </div>
      )}
    </div>
  )
}
