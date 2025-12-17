import { NextResponse } from 'next/server'

import { FESTIVALS } from '../../../../lib/scraper/config'
import { ArtistDetails, FestivalId, scrapeFestival } from '../../../../lib/scraper/core'
import { supabaseAdmin } from '../../../../lib/supabase/admin'

export const runtime = 'nodejs'

type UpsertResult = {
  festival: FestivalId
  festivalRowId: string
  bandsInserted: number
  bandsUpdated: number
  lineupsUpserted: number
  skipped: number
  scrapedLinks: number
  scrapeFailures: number
  scrapeFailureSamples: Array<{ url: string; reason: string }>
}

const CRON_SECRET = process.env.CRON_SECRET

export async function GET(request: Request) {
  if (CRON_SECRET) {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const url = new URL(request.url)
  const limitParam = url.searchParams.get('limit')
  const limit = limitParam ? Number(limitParam) : undefined

  const festivalParam = url.searchParams.get('festival')?.toLowerCase() as FestivalId | undefined
  const targets = festivalParam
    ? FESTIVALS.filter((f) => f.id === festivalParam)
    : FESTIVALS

  if (!targets.length) {
    return NextResponse.json({ error: 'Unknown festival param' }, { status: 400 })
  }

  const results: UpsertResult[] = []

  for (const festival of targets) {
    const festivalRowId = await ensureFestival(festival.id)
    const scraped = await scrapeFestival(festival, { limit })

    let bandsInserted = 0
    let bandsUpdated = 0
    let lineupsUpserted = 0
    let skipped = 0

    for (const detail of scraped.details) {
      if (!detail.name) {
        skipped += 1
        continue
      }

      const { inserted, id: bandId } = await upsertBand(detail)
      bandsInserted += inserted ? 1 : 0
      bandsUpdated += inserted ? 0 : 1

      await upsertLineup(festivalRowId, bandId, detail)
      lineupsUpserted += 1
    }

    results.push({
      festival: festival.id,
      festivalRowId,
      bandsInserted,
      bandsUpdated,
      lineupsUpserted,
      skipped,
      scrapedLinks: scraped.links.length,
      scrapeFailures: scraped.failures.length,
      scrapeFailureSamples: scraped.failures.slice(0, 5),
    })
  }

  return NextResponse.json({ ok: true, results })
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
