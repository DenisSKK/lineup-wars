import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'node:fs/promises';
import path from 'node:path';

// Temporary playground to probe selectors for Rock for People and Nova Rock.
// Run with: pnpm tsx scripts/scraper-playground.ts --festival rfp|novarock|all [--limit 10] [--pretty]

type FestivalId = 'rfp' | 'novarock';

type ArtistSelectors = {
  name: string;
  day: string;
  stage?: string;
  time?: string;
};

type FestivalConfig = {
  id: FestivalId;
  name: string;
  indexUrls: string[];
  baseUrl: string;
  linkSelector: string;
  linkAllowPattern?: RegExp;
  linkDenyPattern?: RegExp;
  artistSelectors: ArtistSelectors;
  storageFile: string;
  detailsFile: string;
};

type ArtistRow = {
  festival: FestivalId;
  url: string;
  slug?: string;
  name?: string;
  country?: string;
  day?: string;
  stage?: string;
  time?: string;
};

type ArtistDetails = {
  festival: FestivalId;
  url: string;
  slug: string;
  name?: string;
  country?: string;
  day?: string;
  stage?: string;
  time?: string;
};

type ScrapeResult = {
  festival: FestivalId;
  totalLinks: number;
  scraped: ArtistRow[];
  failures: Array<{ url: string; reason: string }>;
  savedLinksFile?: string;
  savedDetailsFile?: string;
};

const FESTIVALS: FestivalConfig[] = [
  {
    id: 'rfp',
    name: 'Rock for People 2025',
    indexUrls: ['https://rockforpeople.cz/lineup/'],
    baseUrl: 'https://rockforpeople.cz',
    linkSelector: 'a[href*="/lineup/"]',
    linkAllowPattern: /\/lineup\/[^\/]+\/?$/,
    linkDenyPattern: /\/(en\/)?lineup\/?$/,
    storageFile: 'rfp-links.json',
    detailsFile: 'rfp-details.json',
    // TODO: refine selectors after first run
    artistSelectors: {
      name: 'h1',
      day: '.day, .date, [class*="day"]',
      stage: '.stage, [class*="stage"]',
      time: '.time, [class*="time"]',
    },
  },
  {
    id: 'novarock',
    name: 'Nova Rock 2025',
    indexUrls: [
      'https://www.novarock.at/en/lineup/#tab-2026-06-11',
      'https://www.novarock.at/en/lineup/#tab-2026-06-12',
      'https://www.novarock.at/en/lineup/#tab-2026-06-13',
      'https://www.novarock.at/en/lineup/#tab-2026-06-14',
    ],
    baseUrl: 'https://www.novarock.at',
    linkSelector: 'a[href*="/artist/"]',
    linkAllowPattern: /\/(en\/)?artist\/[A-Za-z0-9-]+\/?$/,
    storageFile: 'novarock-links.json',
    detailsFile: 'novarock-details.json',
    // TODO: refine selectors after first run
    artistSelectors: {
      name: 'h1, .artist-title',
      day: '.performance-date, .date',
      stage: '.performance-stage, .stage',
      time: '.performance-time, .time',
    },
  },
];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeText(input: string | undefined): string | undefined {
  if (!input) return undefined;
  const trimmed = input.replace(/\s+/g, ' ').trim();
  return trimmed.length ? trimmed : undefined;
}

function extractSlug(url: string): string | undefined {
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/').filter(Boolean);
    return parts[parts.length - 1];
  } catch (_) {
    return undefined;
  }
}

function splitNameAndCountry(raw?: string): { name?: string; country?: string } {
  const clean = normalizeText(raw);
  if (!clean) return { name: undefined, country: undefined };
  const match = clean.match(/^(.*)\s+([A-Z]{2})$/);
  if (match) {
    const base = normalizeText(match[1]);
    const country = match[2];
    return { name: base, country };
  }
  return { name: clean, country: undefined };
}

async function fetchHtml(url: string): Promise<string> {
  const response = await axios.get<string>(url, {
    headers: {
      'User-Agent': 'lineup-wars-scraper-playground',
      Accept: 'text/html,application/xhtml+xml',
    },
    timeout: 15000,
  });
  return response.data;
}

function collectLinks(html: string, config: FestivalConfig): string[] {
  const $ = cheerio.load(html);
  const urls = new Set<string>();
  $(config.linkSelector).each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    const absolute = href.startsWith('http') ? href : `${config.baseUrl}${href}`;
    if (config.linkAllowPattern && !config.linkAllowPattern.test(absolute)) return;
    if (config.linkDenyPattern && config.linkDenyPattern.test(absolute)) return;
    urls.add(absolute);
  });
  return Array.from(urls);
}

async function scrapeArtist(
  festival: FestivalId,
  url: string,
  selectors: ArtistSelectors,
): Promise<ArtistRow> {
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);
  const pick = (sel?: string) => normalizeText(sel ? $(sel).first().text() : undefined);
  const { name, country } = splitNameAndCountry(pick(selectors.name));
  const textBlob = normalizeText($.root().text()) ?? '';
  const parsedMeta =
    festival === 'rfp'
      ? parseRfpDateStageTime(textBlob)
      : parseNovaRockDateStageTime(textBlob);
  const stageRaw = pick(selectors.stage) ?? parsedMeta.stage;
  const timeRaw = pick(selectors.time) ?? parsedMeta.time;
  return {
    festival,
    url,
    slug: extractSlug(url),
    name,
    country,
    day: pick(selectors.day) ?? parsedMeta.day,
    stage: sanitizeStage(stageRaw) ?? 'TBA',
    time: sanitizeTime(timeRaw) ?? 'TBA',
  };
}

async function scrapeFestival(config: FestivalConfig, limit?: number): Promise<ScrapeResult> {
  const indexHtmls = await Promise.all(config.indexUrls.map(fetchHtml));
  const links = indexHtmls.flatMap((html) => collectLinks(html, config));
  const uniqueLinks = Array.from(new Set(links));
  const slice = typeof limit === 'number' ? uniqueLinks.slice(0, limit) : uniqueLinks;

  const scraped: ArtistRow[] = [];
  const failures: Array<{ url: string; reason: string }> = [];

  for (const url of slice) {
    try {
      const row = await scrapeArtist(config.id, url, config.artistSelectors);
      scraped.push(row);
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'unknown error';
      failures.push({ url, reason });
    }
    await sleep(200);
  }

  // Merge links into storage file (URL list), keeping existing and adding new.
  const storagePath = path.join(process.cwd(), 'data', config.storageFile);
  const existing = (await readJson<string[]>(storagePath)) ?? [];
  const merged = Array.from(new Set([...existing, ...uniqueLinks]));
  await writeJson(storagePath, merged);

  // Detail scrape: read full link list (merged) and fetch details.
  const detailLinks = merged;
  const details: ArtistDetails[] = [];
  const existingDetailsPath = path.join(process.cwd(), 'data', config.detailsFile);
  const existingDetails = (await readJson<ArtistDetails[]>(existingDetailsPath)) ?? [];
  const detailLimit = typeof limit === 'number' ? limit : undefined;
  const detailSlice = typeof detailLimit === 'number' ? detailLinks.slice(0, detailLimit) : detailLinks;

  for (const url of detailSlice) {
    try {
      const row = await scrapeArtist(config.id, url, config.artistSelectors);
      if (!row.slug) continue;
      details.push({
        festival: row.festival,
        url: row.url,
        slug: row.slug,
        name: row.name,
        country: row.country,
        day: row.day,
        stage: row.stage,
        time: row.time,
      });
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'unknown error';
      failures.push({ url, reason });
    }
    await sleep(200);
  }

  // Merge details by slug (prefer newest)
  const detailMap = new Map<string, ArtistDetails>();
  for (const d of existingDetails) {
    detailMap.set(d.slug, d);
  }
  for (const d of details) {
    detailMap.set(d.slug, { ...detailMap.get(d.slug), ...d });
  }
  const mergedDetails = Array.from(detailMap.values());
  await writeJson(existingDetailsPath, mergedDetails);

  return {
    festival: config.id,
    totalLinks: uniqueLinks.length,
    scraped,
    failures,
    savedLinksFile: storagePath,
    savedDetailsFile: existingDetailsPath,
  };
}

async function readJson<T>(filePath: string): Promise<T | undefined> {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data) as T;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw err;
  }
}

async function writeJson(filePath: string, data: unknown) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function parseRfpDateStageTime(text: string): { day?: string; stage?: string; time?: string } {
  const normalized = normalizeText(text) ?? '';
  const dayMatch = normalized.match(
    /(Pondělí|Úterý|Středa|Čtvrtek|Pátek|Sobota|Neděle|Mon|Tue|Wed|Thu|Fri|Sat|Sun)[^\d]{0,10}\s?(\d{1,2}\.\s*\d{1,2}\.)/i,
  );
  const day = dayMatch ? dayMatch[0] : undefined;
  // RFP site currently does not expose stage/time per artist; leave undefined to avoid false positives.
  return { day, stage: undefined, time: undefined };
}

function parseNovaRockDateStageTime(text: string): { day?: string; stage?: string; time?: string } {
  const normalized = normalizeText(text) ?? '';
  const blockMatch = normalized.match(/SHOW DAY\s+([^\n]+?)\s+STAGE\s+([^\n]+?)\s+STAGE TIME\s+([^\n]+)/i);
  if (blockMatch) {
    return {
      day: normalizeText(blockMatch[1]),
      stage: normalizeText(blockMatch[2]),
      time: normalizeText(blockMatch[3]),
    };
  }
  // fallback: look for date and time separately
  const dayMatch = normalized.match(/(Mon|Tue|Wed|Thu|Fri|Sat|Sun)[^\d]{0,10}\s?\d{1,2}\.\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December)/i);
  const timeMatch = normalized.match(/(\d{1,2}:\d{2})/);
  const stageMatch = normalized.match(/STAGE\s+([A-Za-z0-9\- ]{2,40})/i);
  return {
    day: dayMatch ? dayMatch[0] : undefined,
    stage: stageMatch ? normalizeText(stageMatch[1]) : undefined,
    time: timeMatch ? timeMatch[1] : undefined,
  };
}

function sanitizeStage(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const clean = normalizeText(value);
  if (!clean) return undefined;
  if (/event-card/i.test(clean)) return undefined;
  if (/^tba$/i.test(clean)) return 'TBA';
  return clean;
}

function sanitizeTime(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const clean = normalizeText(value);
  if (!clean) return undefined;
  if (/^tba$/i.test(clean)) return 'TBA';
  const timeMatch = clean.match(/^(\d{1,2}:\d{2})$/);
  return timeMatch ? timeMatch[1] : undefined;
}

function parseArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx === -1 || idx === process.argv.length - 1) return undefined;
  return process.argv[idx + 1];
}

function parseBool(flag: string): boolean {
  return process.argv.includes(flag);
}

async function main() {
  const festivalArg = (parseArg('--festival') ?? 'all').toLowerCase();
  const limitArg = parseArg('--limit');
  const limit = limitArg ? Number(limitArg) : undefined;
  const pretty = parseBool('--pretty');
  const verbose = parseBool('--verbose');

  const targets =
    festivalArg === 'all'
      ? FESTIVALS
      : FESTIVALS.filter((f) => f.id === festivalArg);

  if (!targets.length) {
    console.error(`Unknown festival: ${festivalArg}. Use rfp, novarock, or all.`);
    process.exit(1);
  }

  const results: ScrapeResult[] = [];
  for (const festival of targets) {
    if (verbose) {
      console.error(`Scraping ${festival.name} (${festival.id})...`);
    }
    const result = await scrapeFestival(festival, limit);
    results.push(result);
    if (verbose) {
      console.error(
        `Done ${festival.id}: links=${result.totalLinks}, scraped=${result.scraped.length}, failures=${result.failures.length}, linksFile=${result.savedLinksFile}, detailsFile=${result.savedDetailsFile}`,
      );
    } else {
      console.error(`Done ${festival.id}: links=${result.totalLinks}, failures=${result.failures.length}`);
    }
  }

  const output = { timestamp: new Date().toISOString(), festivals: results };
  const json = pretty ? JSON.stringify(output, null, 2) : JSON.stringify(output);
}

main().catch((err) => {
  console.error('Fatal error', err);
  process.exit(1);
});
