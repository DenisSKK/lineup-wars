export interface Profile {
  id: string
  email: string
  full_name?: string
  created_at: string
  updated_at: string
}

export interface Festival {
  id: string
  name: string
  year: number
  location?: string
  start_date?: string
  end_date?: string
  description?: string
  image_url?: string
  created_at: string
  updated_at: string
}

export interface Band {
  id: string
  name: string
  genre?: string
  country?: string
  image_url?: string
  description?: string
  slug?: string
  festival_urls?: string[]
  spotify_id?: string
  spotify_url?: string
  spotify_image_url?: string
  spotify_popularity?: number
  spotify_genres?: string[]
  created_at: string
  updated_at: string
}

export interface Lineup {
  id: string
  festival_id: string
  band_id: string
  day_label?: number
  stage?: string
  performance_time?: string
  created_at: string
}

export interface BandRating {
  id: string
  user_id: string
  band_id: string
  festival_id: string
  rating: number
  created_at: string
  updated_at: string
}

export interface Group {
  id: string
  name: string
  description?: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface GroupMember {
  id: string
  group_id: string
  user_id: string
  joined_at: string
}

export interface UserFestival {
  id: string
  user_id: string
  festival_id: string
  selected_at: string
}

// Extended types with related data
export interface LineupWithBand extends Lineup {
  band: Band
}

export interface FestivalWithLineup extends Festival {
  lineups?: LineupWithBand[]
}

export interface BandRatingWithBand extends BandRating {
  band: Band
}

export interface GroupWithMembers extends Group {
  members?: GroupMember[]
  member_count?: number
}
