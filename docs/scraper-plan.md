# Prompt I asked LLM

Quick recon I found is that both I can see are probably JS bundle but I can also see static HTML for links to subpage about artists they have in lineup:
RFP: https://rockforpeople.cz/lineup/electric-callboy/ this is containing Band name and day of concert better
Nova Rock: https://www.novarock.at/en/artist/three-days-grace/ which also contains band name, date, stage, stage time (stage and time are for now TBA)

I think I can see all info in divs and spans inside the subpages of specific bands.
I think I could create a basic scraper, then fill out my DB with bands. Create spotify band matcher to look for spotify artist ID, then also add scraper into some website cron job at like 1a.m. which will scrape all bands, look for new ones, scrape their data and add them to DB (or scrape all bands with incomplete data like once a week). 
Is that possible?

# Answer from LLM

Yes, 100% doable. And honestly, that's the smarter approach — scraping the index for links, then hitting subpages for structured data. Way more reliable than trying to parse a messy JS-rendered grid.

---

## Architecture overview

Here's how I'd structure it:

```
┌─────────────────────────────────────────────────────────────────┐
│                        CRON JOB (daily @ 1am)                   │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  1. SCRAPE INDEX PAGES                                          │
│     - GET rockforpeople.cz/lineup/                              │
│     - GET novarock.at/en/lineup/                                │
│     - Extract all artist subpage URLs                           │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. SCRAPE EACH ARTIST SUBPAGE                                  │
│     - Band name                                                 │
│     - Day                                                       │
│     - Stage (if available)                                      │
│     - Time (if available)                                       │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. DIFF AGAINST DB                                             │
│     - New bands? → insert                                       │
│     - Existing but incomplete? → update                         │
│     - Removed from lineup? → flag / soft delete                 │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. SPOTIFY MATCHER (for new/unmatched bands)                   │
│     - Search Spotify API by band name                           │
│     - Store spotify_id, image_url, genres                       │
└─────────────────────────────────────────────────────────────────┘
```

Note from me about LLM's answer: I think it should have separate cron job for scraping only incomplete bands once a week (bands without date, without stage, without time - watch out as only Nova Rock has these fields for Stage and Time, maybe RFP will have it too but it's too soon to tell)

---

## 1. Vercel Cron Jobs

Vercel supports cron via `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/scrape-lineups",
      "schedule": "0 1 * * *"
    }
  ]
}
```

This hits your API route at 1:00 AM UTC daily.

**Caveats:**
- Free tier: limited to 1 cron job, runs once/day max.
- Pro tier: more flexibility.
- Execution timeout: 10s on Hobby, 60s on Pro. If scraping takes longer, you might need to:
  - Trigger a background job (e.g., Inngest, QStash, or a simple queue), or
  - Split into multiple lighter endpoints.

For ~50–100 bands across two festivals, you can probably do it in one shot if you're smart about it.

---

## 2. Two-phase scraper

### Phase 1: Get all artist URLs from index

```ts
// lib/scrapers/index-scraper.ts
import axios from 'axios';
import * as cheerio from 'cheerio';

type FestivalConfig = {
  name: string;
  indexUrl: string;
  linkSelector: string; // e.g., 'a.artist-link'
  baseUrl: string;      // to resolve relative URLs
};

export async function getArtistUrls(config: FestivalConfig): Promise<string[]> {
  const { data: html } = await axios.get(config.indexUrl);
  const $ = cheerio.load(html);

  const urls: string[] = [];

  $(config.linkSelector).each((_, el) => {
    const href = $(el).attr('href');
    if (href) {
      const fullUrl = href.startsWith('http') 
        ? href 
        : `${config.baseUrl}${href}`;
      urls.push(fullUrl);
    }
  });

  return [...new Set(urls)]; // dedupe
}
```

### Phase 2: Scrape each artist subpage

```ts
// lib/scrapers/artist-scraper.ts
import axios from 'axios';
import * as cheerio from 'cheerio';

type ArtistData = {
  name: string;
  day?: string;
  stage?: string;
  time?: string;
  sourceUrl: string;
};

type ArtistPageConfig = {
  nameSelector: string;
  daySelector: string;
  stageSelector?: string;
  timeSelector?: string;
};

export async function scrapeArtistPage(
  url: string,
  config: ArtistPageConfig
): Promise<ArtistData | null> {
  try {
    const { data: html } = await axios.get(url);
    const $ = cheerio.load(html);

    const name = $(config.nameSelector).first().text().trim();
    if (!name) return null;

    return {
      name,
      day: $(config.daySelector).first().text().trim() || undefined,
      stage: config.stageSelector 
        ? $(config.stageSelector).first().text().trim() || undefined 
        : undefined,
      time: config.timeSelector 
        ? $(config.timeSelector).first().text().trim() || undefined 
        : undefined,
      sourceUrl: url,
    };
  } catch (e) {
    console.error(`Failed to scrape ${url}:`, e);
    return null;
  }
}
```

---

## 3. Spotify matcher

```ts
// lib/spotify/match-artist.ts
import axios from 'axios';

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getSpotifyToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const { data } = await axios.post(
    'https://accounts.spotify.com/api/token',
    new URLSearchParams({ grant_type: 'client_credentials' }),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(
          `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
        ).toString('base64')}`,
      },
    }
  );

  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000 - 60_000, // refresh 1min early
  };

  return cachedToken.token;
}

export async function matchSpotifyArtist(bandName: string) {
  const token = await getSpotifyToken();

  const { data } = await axios.get('https://api.spotify.com/v1/search', {
    params: {
      q: bandName,
      type: 'artist',
      limit: 1,
    },
    headers: { Authorization: `Bearer ${token}` },
  });

  const artist = data.artists?.items?.[0];
  if (!artist) return null;

  return {
    spotifyId: artist.id,
    spotifyUrl: artist.external_urls.spotify,
    imageUrl: artist.images?.[0]?.url ?? null,
    genres: artist.genres ?? [],
    popularity: artist.popularity,
  };
}
```

Note from me about LLM's answer: I think Spotify matcher should be later stage feature of this cron job. But I think preparing DB for it is a good idea even in this stage.

---

## 4. Main cron handler

```ts
// app/api/cron/scrape-lineups/route.ts
import { NextResponse } from 'next/server';
import { getArtistUrls } from '@/lib/scrapers/index-scraper';
import { scrapeArtistPage } from '@/lib/scrapers/artist-scraper';
import { matchSpotifyArtist } from '@/lib/spotify/match-artist';
import { supabase } from '@/lib/supabase-admin';

const FESTIVALS = [
  {
    id: 'rfp-2025',
    name: 'Rock for People 2025',
    indexUrl: 'https://rockforpeople.cz/lineup/',
    baseUrl: 'https://rockforpeople.cz',
    linkSelector: 'a[href^="/lineup/"]', // adjust after inspection
    artistPage: {
      nameSelector: 'h1.artist-name',    // adjust
      daySelector: '.artist-day',         // adjust
      stageSelector: '.artist-stage',     // adjust
      timeSelector: '.artist-time',       // adjust
    },
  },
  {
    id: 'novarock-2025',
    name: 'Nova Rock 2025',
    indexUrl: 'https://www.novarock.at/en/lineup/',
    baseUrl: 'https://www.novarock.at',
    linkSelector: 'a[href*="/en/artist/"]', // adjust
    artistPage: {
      nameSelector: 'h1.artist-title',
      daySelector: '.performance-date',
      stageSelector: '.performance-stage',
      timeSelector: '.performance-time',
    },
  },
];

export async function GET(request: Request) {
  // Optional: verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results = { processed: 0, newBands: 0, spotifyMatched: 0 };

  for (const festival of FESTIVALS) {
    // 1. Get all artist URLs
    const artistUrls = await getArtistUrls({
      name: festival.name,
      indexUrl: festival.indexUrl,
      baseUrl: festival.baseUrl,
      linkSelector: festival.linkSelector,
    });

    // 2. Scrape each artist
    for (const url of artistUrls) {
      const artistData = await scrapeArtistPage(url, festival.artistPage);
      if (!artistData) continue;

      results.processed++;

      // 3. Upsert band
      const { data: existingBand } = await supabase
        .from('bands')
        .select('id, spotify_id')
        .eq('name', artistData.name)
        .single();

      let bandId: string;

      if (existingBand) {
        bandId = existingBand.id;
      } else {
        // New band — insert
        const { data: newBand } = await supabase
          .from('bands')
          .insert({ name: artistData.name })
          .select()
          .single();

        bandId = newBand!.id;
        results.newBands++;
      }

      // 4. Upsert festival_bands link
      await supabase.from('festival_bands').upsert(
        {
          festival_id: festival.id,
          band_id: bandId,
          day: artistData.day,
          stage: artistData.stage,
          time: artistData.time,
        },
        { onConflict: 'festival_id,band_id' }
      );

      // 5. Spotify match if missing
      const needsSpotify = !existingBand?.spotify_id;
      if (needsSpotify) {
        const spotify = await matchSpotifyArtist(artistData.name);
        if (spotify) {
          await supabase
            .from('bands')
            .update({
              spotify_id: spotify.spotifyId,
              spotify_url: spotify.spotifyUrl,
              image_url: spotify.imageUrl,
              genres: spotify.genres,
              popularity: spotify.popularity,
            })
            .eq('id', bandId);

          results.spotifyMatched++;
        }
      }

      // Be nice to servers — small delay between requests
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  return NextResponse.json({ success: true, ...results });
}
```

---

## 5. DB schema additions you might need

```sql
-- bands table additions
-- festival_urls will store one to two urls for each band. Nova Rock url and RFP url.
ALTER TABLE bands ADD COLUMN IF NOT EXISTS festival_urls TEXT[];
ALTER TABLE bands ADD COLUMN IF NOT EXISTS spotify_id TEXT;
ALTER TABLE bands ADD COLUMN IF NOT EXISTS spotify_url TEXT;
-- popularity is optional field in my opinion
ALTER TABLE bands ADD COLUMN IF NOT EXISTS popularity INTEGER;

```

---

## 6. Weekly "refresh incomplete" logic

You could add a second cron (or flag in the same one) that:

```ts
// Find bands with missing spotify data
const { data: incompleteBands } = await supabase
  .from('bands')
  .select('id, name')
  .is('spotify_id', null);

// Re-attempt matching
for (const band of incompleteBands ?? []) {
  const spotify = await matchSpotifyArtist(band.name);
  // ... update if found
}
```

Run this weekly to catch:
- Spotify search improvements (new artists indexed).
- Name variations you might have cleaned up.

---

## 7. Gotchas to watch for

1. **Rate limiting**: Add delays between requests (200–500ms). Don't hammer festival sites.

2. **Selector changes**: Festival sites redesign. Your scraper will break. Build in error handling and maybe alerting (log failures, send yourself a Discord/Slack webhook).

3. **Spotify name mismatches**: "Electric Callboy" might be indexed as "Eskimo Callboy" (their old name). You might need a manual override table for edge cases:
   ```sql
   CREATE TABLE band_name_overrides (
     scraped_name TEXT PRIMARY KEY,
     spotify_name TEXT NOT NULL
   );
   ```

4. **Vercel timeout**: If you have 100+ bands, you might hit the 60s limit. Solutions:
   - Process in batches across multiple cron triggers.
   - Use a queue service (Inngest, QStash, Trigger.dev).
   - Move heavy scraping to a separate service (Railway, Fly.io, etc.).

---

### TL;DR

Your plan is solid and very achievable:

- Scrape index → get artist URLs → scrape subpages → upsert to DB → match Spotify.
- Vercel Cron for daily runs.
- Weekly pass for incomplete data.
- Budget ~2–3 hours to get the first version working, mostly spent on inspecting HTML and tuning selectors.
