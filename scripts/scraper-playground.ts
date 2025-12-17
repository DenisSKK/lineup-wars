import fs from 'node:fs/promises';
import path from 'node:path';

import { FESTIVALS } from '../lib/scraper/config';
import { ArtistDetails, FestivalId, ScrapeResult, scrapeFestival } from '../lib/scraper/core';

// Temporary playground to probe selectors for Rock for People and Nova Rock.
// Run with: pnpm tsx scripts/scraper-playground.ts --festival rfp|novarock|all [--limit 10] [--pretty]
type PlaygroundResult = ScrapeResult & {
  savedLinksFile?: string;
  savedDetailsFile?: string;
};

const STORAGE_FILES: Record<FestivalId, { links: string; details: string }> = {
  rfp: { links: 'rfp-links.json', details: 'rfp-details.json' },
  novarock: { links: 'novarock-links.json', details: 'novarock-details.json' },
};

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

function mergeDetails(existing: ArtistDetails[], incoming: ArtistDetails[]): ArtistDetails[] {
  const map = new Map<string, ArtistDetails>();
  let skippedCount = 0;

  // Helper to generate a key with fallback: slug > url > name
  const getKey = (detail: ArtistDetails): string | undefined => {
    if (detail.slug) return detail.slug;
    if (detail.url) return detail.url;
    if (detail.name) return `name:${detail.name}`;
    return undefined;
  };

  for (const detail of existing) {
    const key = getKey(detail);
    if (!key) {
      skippedCount++;
      console.warn(`⚠️  Skipping existing detail without slug/url/name:`, detail);
      continue;
    }
    map.set(key, detail);
  }

  for (const detail of incoming) {
    const key = getKey(detail);
    if (!key) {
      skippedCount++;
      console.warn(`⚠️  Skipping incoming detail without slug/url/name:`, detail);
      continue;
    }
    const previous = map.get(key) ?? {};
    map.set(key, { ...previous, ...detail });
  }

  if (skippedCount > 0) {
    console.warn(`⚠️  Total details skipped due to missing identifiers: ${skippedCount}`);
  }

  return Array.from(map.values());
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

  const targets = festivalArg === 'all' ? FESTIVALS : FESTIVALS.filter((f) => f.id === festivalArg);

  if (!targets.length) {
    console.error(`Unknown festival: ${festivalArg}. Use rfp, novarock, or all.`);
    process.exit(1);
  }

  const results: PlaygroundResult[] = [];
  for (const festival of targets) {
    if (verbose) {
      console.error(`Scraping ${festival.name} (${festival.id})...`);
    }
    const scraped = await scrapeFestival(festival, { limit });

    const storageFiles = STORAGE_FILES[festival.id];
    const storagePath = path.join(process.cwd(), 'data', storageFiles.links);
    const existingLinks = (await readJson<string[]>(storagePath)) ?? [];
    const mergedLinks = Array.from(new Set([...existingLinks, ...scraped.links]));
    await writeJson(storagePath, mergedLinks);

    const detailsPath = path.join(process.cwd(), 'data', storageFiles.details);
    const existingDetails = (await readJson<ArtistDetails[]>(detailsPath)) ?? [];
    const mergedDetails = mergeDetails(existingDetails, scraped.details);
    await writeJson(detailsPath, mergedDetails);

    const result: PlaygroundResult = {
      ...scraped,
      savedLinksFile: storagePath,
      savedDetailsFile: detailsPath,
    };
    results.push(result);
    if (verbose) {
      console.error(
        `Done ${festival.id}: links=${scraped.links.length}, details=${scraped.details.length}, failures=${scraped.failures.length}, linksFile=${result.savedLinksFile}, detailsFile=${result.savedDetailsFile}`,
      );
    } else {
      console.error(`Done ${festival.id}: links=${scraped.links.length}, failures=${scraped.failures.length}`);
    }
  }

  const output = { timestamp: new Date().toISOString(), festivals: results };
  const json = pretty ? JSON.stringify(output, null, 2) : JSON.stringify(output);
  console.log(json);
}

main().catch((err) => {
  console.error('Fatal error', err);
  process.exit(1);
});
