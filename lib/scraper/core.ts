import axios from 'axios'
import * as cheerio from 'cheerio'

export type FestivalId = 'rfp' | 'novarock'

export type ArtistSelectors = {
  name: string
  day: string
  stage?: string
  time?: string
}

export type FestivalConfig = {
  id: FestivalId
  supabaseId: string
  name: string
  year: number
  indexUrls: string[]
  baseUrl: string
  linkSelector: string
  linkAllowPattern?: RegExp
  linkDenyPattern?: RegExp
  artistSelectors: ArtistSelectors
}

export type ArtistDetails = {
  festival: FestivalId
  url: string
  slug: string | undefined
  name: string | undefined
  country?: string
  day?: string
  stage?: string
  time?: string
}

export type ScrapeFailure = { url: string; reason: string }

export type ScrapeResult = {
  festival: FestivalId
  links: string[]
  details: ArtistDetails[]
  failures: ScrapeFailure[]
}

type DateStageTimeParser = (text: string) => { day?: string; stage?: string; time?: string }

const FESTIVAL_PARSERS: Record<FestivalId, DateStageTimeParser> = {
  rfp: parseRfpDateStageTime,
  novarock: parseNovaRockDateStageTime,
}

const DEFAULT_DELAY_MS = 200
const DEFAULT_TBA_VALUE = 'TBA'

export async function scrapeFestival(
  config: FestivalConfig,
  options?: { limit?: number; delayMs?: number },
): Promise<ScrapeResult> {
  const indexHtmls = await Promise.all(config.indexUrls.map(fetchHtml))
  const collectedLinks = indexHtmls.flatMap((html) => collectLinks(html, config))
  const uniqueLinks = Array.from(new Set(collectedLinks))
  const slice = typeof options?.limit === 'number' ? uniqueLinks.slice(0, options.limit) : uniqueLinks

  const details: ArtistDetails[] = []
  const failures: ScrapeFailure[] = []
  const delay = options?.delayMs ?? DEFAULT_DELAY_MS

  for (const url of slice) {
    try {
      const detail = await scrapeArtist(config.id, url, config.artistSelectors)
      details.push(detail)
    } catch (err) {
      const baseMessage = err instanceof Error ? err.message : String(err)
      const reason = `Failed to scrape ${url}: ${baseMessage || 'unknown error'}`
      failures.push({ url, reason })
    }
    if (delay > 0) {
      await sleep(delay)
    }
  }

  return {
    festival: config.id,
    links: uniqueLinks,
    details,
    failures,
  }
}

export async function scrapeArtist(
  festival: FestivalId,
  url: string,
  selectors: ArtistSelectors,
): Promise<ArtistDetails> {
  const html = await fetchHtml(url)
  const $ = cheerio.load(html)
  const pick = (sel?: string) => normalizeText(sel ? $(sel).first().text() : undefined)
  const { name, country } = splitNameAndCountry(pick(selectors.name))
  const textBlob = normalizeText($.root().text()) ?? ''
  const parser = FESTIVAL_PARSERS[festival]
  const parsedMeta = parser(textBlob)
  const stageRaw = pick(selectors.stage) ?? parsedMeta.stage
  const timeRaw = pick(selectors.time) ?? parsedMeta.time

  return {
    festival,
    url,
    slug: extractSlug(url),
    name,
    country,
    day: pick(selectors.day) ?? parsedMeta.day,
    stage: sanitizeStage(stageRaw) ?? DEFAULT_TBA_VALUE,
    time: sanitizeTime(timeRaw) ?? DEFAULT_TBA_VALUE,
  }
}

export function normalizeText(input: string | undefined): string | undefined {
  if (!input) return undefined
  const trimmed = input.replace(/\s+/g, ' ').trim()
  return trimmed.length ? trimmed : undefined
}

export function extractSlug(url: string): string | undefined {
  try {
    const u = new URL(url)
    const parts = u.pathname.split('/').filter(Boolean)
    return parts[parts.length - 1]
  } catch (_) {
    return undefined
  }
}

export function splitNameAndCountry(raw?: string): { name?: string; country?: string } {
  const clean = normalizeText(raw)
  if (!clean) return { name: undefined, country: undefined }
  const match = clean.match(/^(.*)\s+([A-Z]{2})$/)
  if (match) {
    const base = normalizeText(match[1])
    const country = match[2]
    return { name: base ?? undefined, country }
  }
  return { name: clean, country: undefined }
}

export async function fetchHtml(url: string): Promise<string> {
  const response = await axios.get<string>(url, {
    headers: {
      'User-Agent': 'lineup-wars-scraper/1.0',
      Accept: 'text/html,application/xhtml+xml',
    },
    timeout: 15000,
  })
  return response.data
}

export function collectLinks(html: string, config: FestivalConfig): string[] {
  const $ = cheerio.load(html)
  const urls = new Set<string>()
  $(config.linkSelector).each((_, el) => {
    const href = $(el).attr('href')
    if (!href) return
    const absolute = href.startsWith('http') ? href : `${config.baseUrl}${href}`
    if (config.linkAllowPattern && !config.linkAllowPattern.test(absolute)) return
    if (config.linkDenyPattern && config.linkDenyPattern.test(absolute)) return
    urls.add(absolute)
  })
  return Array.from(urls)
}

export function parseRfpDateStageTime(text: string): { day?: string; stage?: string; time?: string } {
  const normalized = normalizeText(text) ?? ''
  const dayMatch = normalized.match(
    /(Pondělí|Úterý|Středa|Čtvrtek|Pátek|Sobota|Neděle|Mon|Tue|Wed|Thu|Fri|Sat|Sun)[^\d]{0,10}\s?(\d{1,2}\.\s*\d{1,2}\.)/i,
  )
  const day = dayMatch ? dayMatch[0] : undefined
  return { day, stage: undefined, time: undefined }
}

export function parseNovaRockDateStageTime(text: string): { day?: string; stage?: string; time?: string } {
  const normalized = normalizeText(text) ?? ''
  const blockMatch = normalized.match(/SHOW DAY\s+([^\n]+?)\s+STAGE\s+([^\n]+?)\s+STAGE TIME\s+([^\n]+)/i)
  if (blockMatch) {
    return {
      day: normalizeText(blockMatch[1]),
      stage: normalizeText(blockMatch[2]),
      time: normalizeText(blockMatch[3]),
    }
  }
  const dayMatch = normalized.match(
    /(Mon|Tue|Wed|Thu|Fri|Sat|Sun)[^\d]{0,10}\s?\d{1,2}\.\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December)/i,
  )
  const timeMatch = normalized.match(/(\d{1,2}:\d{2})/)
  const stageMatch = normalized.match(/STAGE\s+([A-Za-z0-9\- ]{2,40})/i)
  return {
    day: dayMatch ? dayMatch[0] : undefined,
    stage: stageMatch ? normalizeText(stageMatch[1]) : undefined,
    time: timeMatch ? timeMatch[1] : undefined,
  }
}

export function sanitizeStage(value: string | undefined): string | undefined {
  if (!value) return undefined
  const clean = normalizeText(value)
  if (!clean) return undefined
  
  // Filter out 'event-card' which is an HTML class name that sometimes gets extracted
  // instead of the actual stage name when the selector matches container elements.
  // TODO: Consider refining the CSS selectors in festival configs to avoid this at the source.
  if (/event-card/i.test(clean)) return undefined
  
  if (/^tba$/i.test(clean)) return DEFAULT_TBA_VALUE
  return clean
}

export function sanitizeTime(value: string | undefined): string | undefined {
  if (!value) return undefined
  const clean = normalizeText(value)
  if (!clean) return undefined
  if (/^tba$/i.test(clean)) return DEFAULT_TBA_VALUE
  const timeMatch = clean.match(/^(\d{1,2}:\d{2})$/)
  return timeMatch ? timeMatch[1] : undefined
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
