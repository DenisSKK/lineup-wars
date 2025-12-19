import 'dotenv/config'
import fs from 'node:fs/promises'
import path from 'node:path'

import { FESTIVALS } from '../lib/scraper/config'
import { ArtistDetails, FestivalId } from '../lib/scraper/core'
import { supabaseAdmin } from '../lib/supabase/admin'

const DETAILS_FILES: Record<FestivalId, string> = {
  rfp: 'rfp-details.json',
  novarock: 'novarock-details.json',
}

type SeedCounters = {
  bandsInserted: number
  bandsUpdated: number
  lineupsUpserted: number
  skipped: number
}

type SeedOptions = {
  festival: 'all' | FestivalId
}

async function loadDetails(id: FestivalId): Promise<ArtistDetails[]> {
  const fileName = DETAILS_FILES[id]
  const filePath = path.join(process.cwd(), 'data', fileName)
  const raw = await fs.readFile(filePath, 'utf8')
  return JSON.parse(raw) as ArtistDetails[]
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

async function seed({ festival }: SeedOptions): Promise<SeedCounters> {
  const targets = festival === 'all' ? (['rfp', 'novarock'] as FestivalId[]) : [festival]
  const counters: SeedCounters = { bandsInserted: 0, bandsUpdated: 0, lineupsUpserted: 0, skipped: 0 }

  for (const festivalConfigId of targets) {
    const festivalData = await ensureFestival(festivalConfigId)
    const details = await loadDetails(festivalConfigId)

    for (const detail of details) {
      if (!detail.name) {
        counters.skipped++
        continue
      }

      const { inserted, id: bandId } = await upsertBand(detail)
      counters.bandsInserted += inserted ? 1 : 0
      counters.bandsUpdated += inserted ? 0 : 1

      await upsertLineup(festivalData.id, bandId, detail, festivalData.year, festivalData.start_date)
      counters.lineupsUpserted += 1
    }
  }

  return counters
}

function parseArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag)
  if (idx === -1 || idx === process.argv.length - 1) return undefined
  return process.argv[idx + 1]
}

async function main() {
  const festivalArg = (parseArg('--festival') ?? 'all').toLowerCase()
  const allowed: Array<'all' | FestivalId> = ['all', 'rfp', 'novarock']
  if (!allowed.includes(festivalArg as 'all' | FestivalId)) {
    console.error(`Unknown festival: ${festivalArg}. Use rfp, novarock, or all.`)
    process.exit(1)
  }

  const counters = await seed({ festival: festivalArg as 'all' | FestivalId })
  console.log(JSON.stringify({ festival: festivalArg, ...counters }, null, 2))
}

main().catch((err) => {
  console.error('Seed failed', err)
  process.exit(1)
})
