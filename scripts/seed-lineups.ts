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

async function ensureFestival(festivalId: FestivalId): Promise<string> {
  const config = FESTIVALS.find((f) => f.id === festivalId)
  if (!config) {
    throw new Error(`Unknown festival config: ${festivalId}`)
  }

  const targetId = config.supabaseId

  const { data: existing, error: selectError } = await supabaseAdmin
    .from('festivals')
    .select('id')
    .eq('id', targetId)
    .maybeSingle()

  if (selectError && selectError.code !== 'PGRST116') {
    throw selectError
  }

  if (existing?.id) return existing.id

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('festivals')
    .insert({ id: targetId, name: config.name, year: config.year })
    .select('id')
    .single()

  if (insertError || !inserted) {
    throw insertError ?? new Error('Failed to insert festival')
  }

  return inserted.id
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

function parsePerformanceTime(label?: string | null): string | null {
  if (!label) return null
  const match = label.trim().match(/^(\d{1,2}:\d{2})$/)
  return match ? match[1] : null
}

async function upsertLineup(festivalId: string, bandId: string, detail: ArtistDetails) {
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
    const festivalId = await ensureFestival(festivalConfigId)
    const details = await loadDetails(festivalConfigId)

    for (const detail of details) {
      if (!detail.name) {
        counters.skipped++
        continue
      }

      const { inserted, id: bandId } = await upsertBand(detail)
      counters.bandsInserted += inserted ? 1 : 0
      counters.bandsUpdated += inserted ? 0 : 1

      await upsertLineup(festivalId, bandId, detail)
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
