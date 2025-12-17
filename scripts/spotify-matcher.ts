#!/usr/bin/env tsx
/**
 * Spotify Band Matcher Script
 * 
 * This script matches bands in the database with their Spotify artist profiles
 * and updates the database with Spotify IDs, URLs, images, popularity, and genres.
 * 
 * Usage:
 *   npm run spotify:match              # Match all bands without Spotify data
 *   npm run spotify:match -- --limit=50  # Match up to 50 bands
 *   npm run spotify:match -- --force    # Re-match all bands (overwrite existing)
 *   npm run spotify:match -- --band="Band Name"  # Match specific band
 */

import 'dotenv/config'
import axios from 'axios'
import { supabaseAdmin } from '../lib/supabase/admin'
import type { Band } from '../lib/types/database'

// Spotify API Configuration
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID ?? ''
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET ?? ''
const SPOTIFY_API_BASE = 'https://api.spotify.com/v1'

interface SpotifyArtist {
  id: string
  name: string
  genres: string[]
  popularity: number
  external_urls: {
    spotify: string
  }
  images: Array<{
    url: string
    height: number
    width: number
  }>
  followers: {
    total: number
  }
}

interface SpotifySearchResponse {
  artists: {
    items: SpotifyArtist[]
  }
}

/**
 * Get Spotify API access token using Client Credentials flow
 */
async function getSpotifyAccessToken(): Promise<string> {
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    throw new Error(
      'Missing Spotify credentials. Please set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in .env file.\n' +
      'Get credentials at: https://developer.spotify.com/dashboard'
    )
  }

  try {
    const response = await axios.post(
      'https://accounts.spotify.com/api/token',
      'grant_type=client_credentials',
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
        },
      }
    )

    return response.data.access_token
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to get Spotify access token: ${error.response?.data?.error_description ?? error.message}`)
    }
    throw error
  }
}

/**
 * Search for an artist on Spotify by name
 */
async function searchSpotifyArtist(
  artistName: string,
  accessToken: string
): Promise<SpotifyArtist | null> {
  try {
    const response = await axios.get<SpotifySearchResponse>(
      `${SPOTIFY_API_BASE}/search`,
      {
        params: {
          q: artistName,
          type: 'artist',
          limit: 5, // Get top 5 results to find best match
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    const artists = response.data.artists.items
    
    if (artists.length === 0) {
      return null
    }

    // Find best match (exact name match or highest popularity)
    const exactMatch = artists.find(
      (artist) => artist.name.toLowerCase() === artistName.toLowerCase()
    )
    
    if (exactMatch) {
      return exactMatch
    }

    // Return most popular artist if no exact match
    return artists.reduce((prev, current) => 
      (current.popularity > prev.popularity) ? current : prev
    )
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 429) {
        // Rate limited
        const retryAfter = parseInt(error.response.headers['retry-after'] ?? '60', 10)
        console.warn(`⚠️  Rate limited. Waiting ${retryAfter} seconds...`)
        await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000))
        return searchSpotifyArtist(artistName, accessToken) // Retry
      }
      console.error(`Error searching for "${artistName}": ${error.message}`)
    }
    return null
  }
}

/**
 * Update band with Spotify data in database
 */
async function updateBandWithSpotifyData(
  bandId: string,
  spotifyArtist: SpotifyArtist
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('bands')
    .update({
      spotify_id: spotifyArtist.id,
      spotify_url: spotifyArtist.external_urls.spotify,
      spotify_image_url: spotifyArtist.images[0]?.url ?? null,
      spotify_popularity: spotifyArtist.popularity,
      spotify_genres: spotifyArtist.genres,
      updated_at: new Date().toISOString(),
    })
    .eq('id', bandId)

  if (error) {
    throw new Error(`Failed to update band ${bandId}: ${error.message}`)
  }
}

/**
 * Fetch bands that need Spotify matching
 */
async function getBandsToMatch(options: {
  force?: boolean
  limit?: number
  bandName?: string
}): Promise<Band[]> {
  let query = supabaseAdmin.from('bands').select('*')

  if (options.bandName) {
    // Match specific band by name
    query = query.ilike('name', options.bandName)
  } else if (!options.force) {
    // Only get bands without Spotify data
    query = query.is('spotify_id', null)
  }

  if (options.limit) {
    query = query.limit(options.limit)
  }

  query = query.order('name', { ascending: true })

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch bands: ${error.message}`)
  }

  return data ?? []
}

/**
 * Main function to match bands with Spotify
 */
async function matchBandsWithSpotify(options: {
  force?: boolean
  limit?: number
  bandName?: string
}): Promise<void> {
  console.log('🎵 Spotify Band Matcher\n')

  // Get Spotify access token
  console.log('🔐 Authenticating with Spotify API...')
  const accessToken = await getSpotifyAccessToken()
  console.log('✅ Authentication successful\n')

  // Fetch bands to match
  console.log('📋 Fetching bands from database...')
  const bands = await getBandsToMatch(options)
  console.log(`📊 Found ${bands.length} band(s) to process\n`)

  if (bands.length === 0) {
    console.log('✨ No bands to match!')
    return
  }

  // Match each band with Spotify
  let matched = 0
  let notFound = 0
  let errors = 0

  for (let i = 0; i < bands.length; i++) {
    const band = bands[i]
    const progress = `[${i + 1}/${bands.length}]`

    try {
      console.log(`${progress} Searching for "${band.name}"...`)

      const spotifyArtist = await searchSpotifyArtist(band.name, accessToken)

      if (spotifyArtist) {
        await updateBandWithSpotifyData(band.id, spotifyArtist)
        console.log(
          `  ✅ Matched: ${spotifyArtist.name} (popularity: ${spotifyArtist.popularity}, genres: ${spotifyArtist.genres.slice(0, 3).join(', ') || 'none'})`
        )
        matched++
      } else {
        console.log(`  ❌ Not found on Spotify`)
        notFound++
      }

      // Rate limiting: Wait 100ms between requests to be nice to Spotify API
      if (i < bands.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    } catch (error) {
      console.error(`  ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      errors++
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50))
  console.log('📊 Summary:')
  console.log(`  ✅ Matched: ${matched}`)
  console.log(`  ❌ Not found: ${notFound}`)
  console.log(`  ⚠️  Errors: ${errors}`)
  console.log(`  📈 Total processed: ${bands.length}`)
  console.log('='.repeat(50))
}

// Parse command line arguments
function parseArgs(): { force?: boolean; limit?: number; bandName?: string } {
  const args = process.argv.slice(2)
  const options: { force?: boolean; limit?: number; bandName?: string } = {}

  for (const arg of args) {
    if (arg === '--force') {
      options.force = true
    } else if (arg.startsWith('--limit=')) {
      options.limit = parseInt(arg.split('=')[1], 10)
    } else if (arg.startsWith('--band=')) {
      options.bandName = arg.split('=')[1]
    }
  }

  return options
}

// Run the script
if (require.main === module) {
  const options = parseArgs()
  
  matchBandsWithSpotify(options)
    .then(() => {
      console.log('\n✨ Done!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Fatal error:', error.message)
      process.exit(1)
    })
}

export { matchBandsWithSpotify, searchSpotifyArtist, getSpotifyAccessToken }
