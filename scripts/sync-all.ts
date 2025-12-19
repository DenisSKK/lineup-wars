#!/usr/bin/env tsx
/**
 * Complete Sync Script
 * 
 * This script runs the complete pipeline:
 * 1. Scrapes festival lineups (merges with existing data)
 * 2. Seeds/updates database (preserves existing bands and lineups)
 * 3. Matches bands with Spotify (only unmatched bands)
 * 
 * Usage:
 *   npm run sync:all                      # Sync all festivals
 *   npm run sync:all -- --festival=rfp    # Sync specific festival
 *   npm run sync:all -- --skip-scrape     # Skip scraping, only seed & match
 *   npm run sync:all -- --skip-spotify    # Skip Spotify matching
 *   npm run sync:all -- --limit=10        # Limit scraper to 10 artists per festival
 *   npm run sync:all -- --spotify-limit=50 # Limit Spotify matching to 50 bands
 */

import 'dotenv/config'
import fs from 'node:fs/promises'
import path from 'node:path'

import { FESTIVALS } from '../lib/scraper/config'
import { ArtistDetails, FestivalId, scrapeFestival } from '../lib/scraper/core'
import { supabaseAdmin } from '../lib/supabase/admin'
import { getSpotifyAccessToken, searchSpotifyArtist } from './spotify-matcher'
import type { Band } from '../lib/types/database'

// ============================================================================
// Configuration & Types
// ============================================================================

const STORAGE_FILES: Record<FestivalId, { links: string; details: string }> = {
  rfp: { links: 'rfp-links.json', details: 'rfp-details.json' },
  novarock: { links: 'novarock-links.json', details: 'novarock-details.json' },
}

interface SyncOptions {
  festival: 'all' | FestivalId
  skipScrape?: boolean
  skipSpotify?: boolean
  scraperLimit?: number
  spotifyLimit?: number
  verbose?: boolean
}

interface SyncStats {
  scraper: {
    linksTotal: number
    detailsTotal: number
    failures: number
  }
  seeder: {
    bandsInserted: number
    bandsUpdated: number
    lineupsUpserted: number
    skipped: number
  }
  spotify: {
    matched: number
    notFound: number
    errors: number
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

async function readJson<T>(filePath: string): Promise<T | undefined> {
  try {
    const data = await fs.readFile(filePath, 'utf8')
    return JSON.parse(data) as T
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return undefined
    throw err
  }
}

async function writeJson(filePath: string, data: unknown) {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8')
}

function mergeDetails(existing: ArtistDetails[], incoming: ArtistDetails[]): ArtistDetails[] {
  const map = new Map<string, ArtistDetails>()
  let skippedCount = 0

  // Helper to generate a key with fallback: slug > url > name
  const getKey = (detail: ArtistDetails): string | undefined => {
    if (detail.slug) return detail.slug
    if (detail.url) return detail.url
    if (detail.name) return `name:${detail.name}`
    return undefined
  }

  for (const detail of existing) {
    const key = getKey(detail)
    if (!key) {
      skippedCount++
      console.warn(`⚠️  Skipping existing detail without slug/url/name:`, detail)
      continue
    }
    map.set(key, detail)
  }

  for (const detail of incoming) {
    const key = getKey(detail)
    if (!key) {
      skippedCount++
      console.warn(`⚠️  Skipping incoming detail without slug/url/name:`, detail)
      continue
    }
    const previous = map.get(key) ?? {}
    map.set(key, { ...previous, ...detail })
  }

  if (skippedCount > 0) {
    console.warn(`⚠️  Total details skipped due to missing identifiers: ${skippedCount}`)
  }

  return Array.from(map.values())
}

// ============================================================================
// Step 1: Scraper (with merge)
// ============================================================================

async function runScraper(
  festivalId: FestivalId,
  options: Pick<SyncOptions, 'scraperLimit' | 'verbose'>
): Promise<{ links: number; details: number; failures: number }> {
  const festival = FESTIVALS.find((f) => f.id === festivalId)
  if (!festival) {
    throw new Error(`Unknown festival: ${festivalId}`)
  }

  if (options.verbose) {
    console.log(`  📡 Scraping ${festival.name}...`)
  }

  const scraped = await scrapeFestival(festival, { limit: options.scraperLimit })

  // Merge links
  const storageFiles = STORAGE_FILES[festivalId]
  const linksPath = path.join(process.cwd(), 'data', storageFiles.links)
  const existingLinks = (await readJson<string[]>(linksPath)) ?? []
  const mergedLinks = Array.from(new Set([...existingLinks, ...scraped.links]))
  await writeJson(linksPath, mergedLinks)

  // Merge details
  const detailsPath = path.join(process.cwd(), 'data', storageFiles.details)
  const existingDetails = (await readJson<ArtistDetails[]>(detailsPath)) ?? []
  const mergedDetails = mergeDetails(existingDetails, scraped.details)
  await writeJson(detailsPath, mergedDetails)

  if (options.verbose) {
    console.log(
      `    ✅ Scraped: ${scraped.links.length} links, ${scraped.details.length} details, ${scraped.failures.length} failures`
    )
    console.log(`    💾 Total in storage: ${mergedLinks.length} links, ${mergedDetails.length} details`)
  }

  return {
    links: mergedLinks.length,
    details: mergedDetails.length,
    failures: scraped.failures.length,
  }
}

// ============================================================================
// Step 2: Seeder (upsert only)
// ============================================================================

async function loadDetails(id: FestivalId): Promise<ArtistDetails[]> {
  const fileName = STORAGE_FILES[id].details
  const filePath = path.join(process.cwd(), 'data', fileName)
  const raw = await fs.readFile(filePath, 'utf8')
  return JSON.parse(raw) as ArtistDetails[]
}

interface FestivalData {
  id: string
  year: number
  start_date: string | null
}

async function ensureFestival(festivalId: FestivalId): Promise<FestivalData> {
  const config = FESTIVALS.find((f) => f.id === festivalId)
  if (!config) {
    throw new Error(`Unknown festival config: ${festivalId}`)
  }

  const targetId = config.supabaseId

  const { data: existing, error: selectError } = await supabaseAdmin
    .from('festivals')
    .select('id, year, start_date')
    .eq('id', targetId)
    .maybeSingle()

  if (selectError && selectError.code !== 'PGRST116') {
    throw selectError
  }

  if (existing?.id) {
    return {
      id: existing.id,
      year: existing.year ?? config.year,
      start_date: existing.start_date ?? null,
    }
  }

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('festivals')
    .insert({ id: targetId, name: config.name, year: config.year })
    .select('id, year, start_date')
    .single()

  if (insertError || !inserted) {
    throw insertError ?? new Error('Failed to insert festival')
  }

  return {
    id: inserted.id,
    year: inserted.year ?? config.year,
    start_date: inserted.start_date ?? null,
  }
}

async function upsertBand(detail: ArtistDetails): Promise<{ id: string; inserted: boolean }> {
  if (!detail.name) {
    throw new Error('Missing band name')
  }

  const { data: existing, error: selectError } = await supabaseAdmin
    .from('bands')
    .select('id, festival_urls, country, slug')
    .eq('name', detail.name)
    .maybeSingle()

  if (selectError && selectError.code !== 'PGRST116') {
    throw selectError
  }

  if (existing?.id) {
    // Update existing band: merge URLs, preserve other data
    const mergedUrls = Array.from(new Set([...(existing.festival_urls ?? []), detail.url]))
    const updatePayload = {
      festival_urls: mergedUrls,
      country: existing.country ?? detail.country ?? null,
      slug: existing.slug ?? detail.slug ?? null,
    }

    const { error: updateError } = await supabaseAdmin.from('bands').update(updatePayload).eq('id', existing.id)
    if (updateError) throw updateError
    return { id: existing.id, inserted: false }
  }

  // Insert new band
  const insertPayload = {
    name: detail.name,
    country: detail.country ?? null,
    slug: detail.slug ?? null,
    festival_urls: [detail.url],
  }

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('bands')
    .insert(insertPayload)
    .select('id')
    .single()

  if (insertError || !inserted) {
    throw insertError ?? new Error('Failed to insert band')
  }

  return { id: inserted.id, inserted: true }
}

function parsePerformanceTime(label?: string | null): string | null {
  if (!label) return null
  const match = label.trim().match(/^(\d{1,2}:\d{2})$/)
  return match ? match[1] : null
}

// English month names mapping
const englishMonths: Record<string, number> = {
  'january': 1, 'february': 2, 'march': 3, 'april': 4,
  'may': 5, 'june': 6, 'july': 7, 'august': 8,
  'september': 9, 'october': 10, 'november': 11, 'december': 12,
  'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'jun': 6,
  'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12,
}

/**
 * Parse day label to extract day and month
 * Handles formats:
 * - Czech: "Čtvrtek 11. 6."
 * - English: "Thu, 11. June"
 */
function parseDayLabel(dayLabel: string, festivalYear: number): Date | null {
  const normalized = dayLabel.toLowerCase().trim()
  
  // Try Czech format: "Čtvrtek 11. 6."
  const czechMatch = normalized.match(/(\d+)\.\s*(\d+)\.?/)
  if (czechMatch) {
    const day = parseInt(czechMatch[1], 10)
    const month = parseInt(czechMatch[2], 10)
    // Use Date.UTC to avoid timezone issues
    return new Date(Date.UTC(festivalYear, month - 1, day))
  }
  
  // Try English format: "Thu, 11. June"
  const englishMatch = normalized.match(/(\d+)\.?\s*(\w+)/)
  if (englishMatch) {
    const day = parseInt(englishMatch[1], 10)
    const monthStr = englishMatch[2].toLowerCase()
    const month = englishMonths[monthStr]
    
    if (month) {
      // Use Date.UTC to avoid timezone issues
      return new Date(Date.UTC(festivalYear, month - 1, day))
    }
  }
  
  return null
}

/**
 * Calculate day number based on festival start date
 * First day is Day 1
 */
function calculateDayNumber(performanceDate: Date, festivalStartDate: Date): number {
  const diffTime = performanceDate.getTime() - festivalStartDate.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays < 0) {
    return 0 // Pre-festival day
  }
  
  return diffDays + 1 // Day 1, Day 2, etc.
}

async function upsertLineup(
  festivalId: string,
  bandId: string,
  detail: ArtistDetails,
  festivalYear: number,
  festivalStartDate: string | null
) {
  // Parse performance date and day number from day_label
  let performanceDate: string | null = null
  let dayNumber: number | null = null

  if (detail.day && festivalStartDate) {
    const parsedDate = parseDayLabel(detail.day, festivalYear)
    if (parsedDate) {
      performanceDate = parsedDate.toISOString().split('T')[0]
      const startDate = new Date(festivalStartDate)
      dayNumber = calculateDayNumber(parsedDate, startDate)
    }
  }

  const payload = {
    festival_id: festivalId,
    band_id: bandId,
    slug: detail.slug ?? null,
    source_url: detail.url,
    day_label: detail.day ?? null,
    stage: detail.stage ?? null,
    stage_label: detail.stage ?? null,
    time_label: detail.time ?? null,
    performance_time: parsePerformanceTime(detail.time),
    performance_date: performanceDate,
    day_number: dayNumber,
  }

  const { error } = await supabaseAdmin
    .from('lineups')
    .upsert(payload, { onConflict: 'festival_id,band_id' })
    .select('id')
    .single()

  if (error) throw error
}

async function runSeeder(
  festivalId: FestivalId,
  options: Pick<SyncOptions, 'verbose'>
): Promise<{ bandsInserted: number; bandsUpdated: number; lineupsUpserted: number; skipped: number }> {
  if (options.verbose) {
    console.log(`  💾 Seeding database...`)
  }

  const festival = await ensureFestival(festivalId)
  const details = await loadDetails(festivalId)

  const counters = { bandsInserted: 0, bandsUpdated: 0, lineupsUpserted: 0, skipped: 0 }

  for (const detail of details) {
    if (!detail.name) {
      counters.skipped++
      continue
    }

    const { inserted, id: bandId } = await upsertBand(detail)
    counters.bandsInserted += inserted ? 1 : 0
    counters.bandsUpdated += inserted ? 0 : 1

    await upsertLineup(festival.id, bandId, detail, festival.year, festival.start_date)
    counters.lineupsUpserted += 1
  }

  if (options.verbose) {
    console.log(
      `    ✅ Seeded: ${counters.bandsInserted} new bands, ${counters.bandsUpdated} updated bands, ${counters.lineupsUpserted} lineups`
    )
  }

  return counters
}

// ============================================================================
// Step 3: Spotify Matcher (only unmatched)
// ============================================================================

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

async function updateBandWithSpotifyData(bandId: string, spotifyArtist: SpotifyArtist): Promise<void> {
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

async function getBandsToMatch(limit?: number): Promise<Band[]> {
  let query = supabaseAdmin.from('bands').select('*').is('spotify_id', null).order('name', { ascending: true })

  if (limit) {
    query = query.limit(limit)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch bands: ${error.message}`)
  }

  return data ?? []
}

async function runSpotifyMatcher(
  options: Pick<SyncOptions, 'spotifyLimit' | 'verbose'>
): Promise<{ matched: number; notFound: number; errors: number }> {
  if (options.verbose) {
    console.log(`  🎵 Matching with Spotify...`)
  }

  // Get Spotify access token
  const accessToken = await getSpotifyAccessToken()

  // Fetch bands to match
  const bands = await getBandsToMatch(options.spotifyLimit)

  if (bands.length === 0) {
    if (options.verbose) {
      console.log(`    ℹ️  No bands need Spotify matching`)
    }
    return { matched: 0, notFound: 0, errors: 0 }
  }

  if (options.verbose) {
    console.log(`    📊 Processing ${bands.length} band(s)...`)
  }

  const counters = { matched: 0, notFound: 0, errors: 0 }

  for (let i = 0; i < bands.length; i++) {
    const band = bands[i]

    try {
      const spotifyArtist = await searchSpotifyArtist(band.name, accessToken)

      if (spotifyArtist) {
        await updateBandWithSpotifyData(band.id, spotifyArtist)
        if (options.verbose) {
          console.log(
            `    ✅ [${i + 1}/${bands.length}] ${band.name} → ${spotifyArtist.name} (pop: ${spotifyArtist.popularity})`
          )
        }
        counters.matched++
      } else {
        if (options.verbose) {
          console.log(`    ❌ [${i + 1}/${bands.length}] ${band.name} → Not found`)
        }
        counters.notFound++
      }

      // Rate limiting: Wait 100ms between requests
      if (i < bands.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    } catch (error) {
      console.error(`    ⚠️  Error matching "${band.name}": ${error instanceof Error ? error.message : 'Unknown error'}`)
      counters.errors++
    }
  }

  return counters
}

// ============================================================================
// Main Pipeline
// ============================================================================

async function runSync(options: SyncOptions): Promise<SyncStats> {
  const targets = options.festival === 'all' ? (['rfp', 'novarock'] as FestivalId[]) : [options.festival]

  const stats: SyncStats = {
    scraper: { linksTotal: 0, detailsTotal: 0, failures: 0 },
    seeder: { bandsInserted: 0, bandsUpdated: 0, lineupsUpserted: 0, skipped: 0 },
    spotify: { matched: 0, notFound: 0, errors: 0 },
  }

  console.log('🚀 Starting Complete Sync Pipeline\n')
  console.log(`Festival(s): ${targets.join(', ')}`)
  console.log(`Skip scraping: ${options.skipScrape ? 'Yes' : 'No'}`)
  console.log(`Skip Spotify: ${options.skipSpotify ? 'Yes' : 'No'}`)
  console.log('')

  // Step 1: Scrape (optional)
  if (!options.skipScrape) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📡 Step 1: Scraping lineups')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    for (const festivalId of targets) {
      const result = await runScraper(festivalId, options)
      stats.scraper.linksTotal += result.links
      stats.scraper.detailsTotal += result.details
      stats.scraper.failures += result.failures
    }
    console.log('')
  }

  // Step 2: Seed database
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('💾 Step 2: Seeding database')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  for (const festivalId of targets) {
    const result = await runSeeder(festivalId, options)
    stats.seeder.bandsInserted += result.bandsInserted
    stats.seeder.bandsUpdated += result.bandsUpdated
    stats.seeder.lineupsUpserted += result.lineupsUpserted
    stats.seeder.skipped += result.skipped
  }
  console.log('')

  // Step 3: Spotify matching (optional)
  if (!options.skipSpotify) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🎵 Step 3: Spotify matching')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    const result = await runSpotifyMatcher(options)
    stats.spotify.matched = result.matched
    stats.spotify.notFound = result.notFound
    stats.spotify.errors = result.errors
    console.log('')
  }

  return stats
}

function printSummary(stats: SyncStats, options: SyncOptions) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📊 SUMMARY')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  if (!options.skipScrape) {
    console.log('Scraper:')
    console.log(`  Links in storage:    ${stats.scraper.linksTotal}`)
    console.log(`  Details in storage:  ${stats.scraper.detailsTotal}`)
    console.log(`  Failures:            ${stats.scraper.failures}`)
    console.log('')
  }

  console.log('Database:')
  console.log(`  New bands:           ${stats.seeder.bandsInserted}`)
  console.log(`  Updated bands:       ${stats.seeder.bandsUpdated}`)
  console.log(`  Lineups upserted:    ${stats.seeder.lineupsUpserted}`)
  console.log(`  Skipped:             ${stats.seeder.skipped}`)
  console.log('')

  if (!options.skipSpotify) {
    console.log('Spotify:')
    console.log(`  Matched:             ${stats.spotify.matched}`)
    console.log(`  Not found:           ${stats.spotify.notFound}`)
    console.log(`  Errors:              ${stats.spotify.errors}`)
    console.log('')
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

// ============================================================================
// CLI
// ============================================================================

function parseArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag)
  if (idx === -1 || idx === process.argv.length - 1) return undefined
  return process.argv[idx + 1]
}

function parseArgValue(prefix: string): string | undefined {
  const arg = process.argv.find((a) => a.startsWith(prefix))
  return arg?.split('=')[1]
}

function parseBool(flag: string): boolean {
  return process.argv.includes(flag)
}

async function main() {
  const festivalArg = (parseArgValue('--festival') ?? 'all').toLowerCase()
  const allowed: Array<'all' | FestivalId> = ['all', 'rfp', 'novarock']

  if (!allowed.includes(festivalArg as 'all' | FestivalId)) {
    console.error(`❌ Unknown festival: ${festivalArg}. Use rfp, novarock, or all.`)
    process.exit(1)
  }

  const options: SyncOptions = {
    festival: festivalArg as 'all' | FestivalId,
    skipScrape: parseBool('--skip-scrape'),
    skipSpotify: parseBool('--skip-spotify'),
    scraperLimit: parseArgValue('--limit') ? parseInt(parseArgValue('--limit')!, 10) : undefined,
    spotifyLimit: parseArgValue('--spotify-limit') ? parseInt(parseArgValue('--spotify-limit')!, 10) : undefined,
    verbose: parseBool('--verbose') || true, // Default to verbose
  }

  const stats = await runSync(options)
  printSummary(stats, options)

  console.log('✨ Sync complete!')
}

if (require.main === module) {
  main().catch((err) => {
    console.error('\n❌ Fatal error:', err)
    process.exit(1)
  })
}

export { runSync }
