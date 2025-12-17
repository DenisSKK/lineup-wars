import axios from 'axios';
import * as cheerio from 'cheerio';

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
  indexUrl: string;
  baseUrl: string;
  linkSelector: string;
  linkAllowPattern?: RegExp;
  linkDenyPattern?: RegExp;
  artistSelectors: ArtistSelectors;
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

type ScrapeResult = {
  festival: FestivalId;
  totalLinks: number;
  scraped: ArtistRow[];
  failures: Array<{ url: string; reason: string }>;
};

const FESTIVALS: FestivalConfig[] = [
  {
    id: 'rfp',
    name: 'Rock for People 2025',
    indexUrl: 'https://rockforpeople.cz/lineup/',
    baseUrl: 'https://rockforpeople.cz',
    linkSelector: 'a[href*="/lineup/"]',
    linkAllowPattern: /\/lineup\/[^\/]+\/?$/,
    linkDenyPattern: /\/(en\/)?lineup\/?$/,
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
    indexUrl: 'https://www.novarock.at/en/lineup/',
    baseUrl: 'https://www.novarock.at',
    linkSelector: 'a[href*="/en/artist/"]',
    linkAllowPattern: /\/en\/artist\/[A-Za-z0-9-]+\/?$/,
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
  return {
    festival,
    url,
    slug: extractSlug(url),
    name,
    country,
    day: pick(selectors.day),
    stage: pick(selectors.stage),
    time: pick(selectors.time),
  };
}

async function scrapeFestival(config: FestivalConfig, limit?: number): Promise<ScrapeResult> {
  const indexHtml = await fetchHtml(config.indexUrl);
  const links = collectLinks(indexHtml, config);
  const slice = typeof limit === 'number' ? links.slice(0, limit) : links;

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

  return { festival: config.id, totalLinks: links.length, scraped, failures };
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
    console.error(`Scraping ${festival.name} (${festival.id})...`);
    const result = await scrapeFestival(festival, limit);
    results.push(result);
    console.error(
      `Done ${festival.id}: ${result.scraped.length} rows (links found: ${result.totalLinks}, failures: ${result.failures.length})`,
    );
  }

  const output = { timestamp: new Date().toISOString(), festivals: results };
  const json = pretty ? JSON.stringify(output, null, 2) : JSON.stringify(output);
  console.log(json);
}

main().catch((err) => {
  console.error('Fatal error', err);
  process.exit(1);
});
