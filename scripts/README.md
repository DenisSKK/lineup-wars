# Scripts Documentation

## sync-all.ts - Complete Pipeline Script

The `sync-all.ts` script is a comprehensive tool that combines scraping, database seeding, and Spotify matching in one unified pipeline. It intelligently updates existing data without overwriting it.

### Features

✅ **Scraper Integration**: Scrapes festival lineups and merges with existing data files
✅ **Smart Database Updates**: Only updates/inserts changed data, preserves existing bands and lineups
✅ **Spotify Matching**: Automatically matches unmatched bands with Spotify artist profiles
✅ **Flexible Options**: Skip steps, limit processing, control verbosity
✅ **Progress Tracking**: Clear visual feedback with detailed statistics

### Usage

#### Basic Usage

```bash
# Sync everything (scrape → seed → spotify match)
npm run sync:all

# Sync specific festival
npm run sync:all -- --festival=rfp
npm run sync:all -- --festival=novarock
```

#### Advanced Options

```bash
# Skip scraping (only seed & match from existing files)
npm run sync:all -- --skip-scrape

# Skip Spotify matching (only scrape & seed)
npm run sync:all -- --skip-spotify

# Limit scraping to first N artists per festival
npm run sync:all -- --limit=10

# Limit Spotify matching to N bands
npm run sync:all -- --spotify-limit=50

# Combine options
npm run sync:all -- --festival=rfp --limit=20 --spotify-limit=100
```

### What It Does

#### Step 1: Scraper (unless --skip-scrape)
- Scrapes festival lineup pages
- Merges new links with existing `data/*-links.json` files
- Merges artist details with existing `data/*-details.json` files
- Uses intelligent key matching (slug → url → name)
- Preserves all existing data while adding new information

#### Step 2: Database Seeder
- Ensures festivals exist in database
- **Bands**: 
  - Inserts new bands
  - Updates existing bands by merging festival URLs
  - Preserves existing country, slug, and Spotify data
- **Lineups**:
  - Upserts lineup entries (insert or update)
  - Uses `festival_id + band_id` as unique constraint
  - Updates performance details (day, stage, time)

#### Step 3: Spotify Matcher (unless --skip-spotify)
- Fetches bands without Spotify IDs (`spotify_id IS NULL`)
- Searches Spotify API for each band
- Updates bands with:
  - Spotify ID and URL
  - Artist image URL
  - Popularity score
  - Genre tags
- Includes rate limiting (100ms between requests)
- Handles API errors gracefully

### Data Flow

```
┌──────────────┐
│   Scraper    │ → Merges with existing JSON files
└──────┬───────┘
       ↓
┌──────────────┐
│ data/*.json  │ ← Persistent storage of scraped data
└──────┬───────┘
       ↓
┌──────────────┐
│  DB Seeder   │ → Upserts bands & lineups
└──────┬───────┘
       ↓
┌──────────────┐
│   Database   │ ← Supabase (bands, lineups, festivals)
└──────┬───────┘
       ↓
┌──────────────┐
│   Spotify    │ → Enriches bands with Spotify data
│   Matcher    │
└──────────────┘
```

### Update Strategy

The script is designed to **update, not overwrite**:

#### Bands
- New bands are inserted
- Existing bands are updated with:
  - Merged festival URLs (no duplicates)
  - Country/slug only if previously empty
  - Spotify data preserved unless re-matched

#### Lineups
- Uses upsert (insert or update)
- Updates performance details for existing entries
- Creates new entries for new festival/band combinations

#### JSON Files
- Links are merged (unique set)
- Details are merged by key (slug/url/name)
- Newer data overwrites older fields for same key

### Output

The script provides detailed progress information:

```
🚀 Starting Complete Sync Pipeline

Festival(s): rfp, novarock
Skip scraping: No
Skip Spotify: No

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📡 Step 1: Scraping lineups
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  📡 Scraping Rock for People...
    ✅ Scraped: 150 links, 150 details, 2 failures
    💾 Total in storage: 150 links, 150 details

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💾 Step 2: Seeding database
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  💾 Seeding database...
    ✅ Seeded: 45 new bands, 105 updated bands, 150 lineups

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎵 Step 3: Spotify matching
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  🎵 Matching with Spotify...
    📊 Processing 45 band(s)...
    ✅ [1/45] The Offspring → The Offspring (pop: 80)
    ...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Scraper:
  Links in storage:    150
  Details in storage:  150
  Failures:            2

Database:
  New bands:           45
  Updated bands:       105
  Lineups upserted:    150
  Skipped:             0

Spotify:
  Matched:             42
  Not found:           2
  Errors:              1

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✨ Sync complete!
```

### Error Handling

- **Scraper failures**: Logged but don't stop the pipeline
- **Database errors**: Throw and stop execution (ensure data consistency)
- **Spotify errors**: Logged individually, other bands continue processing
- **Rate limiting**: Automatic retry with exponential backoff

### Environment Variables

Required for full functionality:

```bash
# Supabase (required for database operations)
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Spotify (required for matching step)
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
```

### When to Use

- **Initial setup**: Full sync to populate database
- **Regular updates**: Re-run to add new artists and update lineups
- **After lineup changes**: Sync specific festival with `--festival=`
- **Incremental updates**: Use `--skip-scrape` to only process existing files
- **Quick updates**: Use limits to process subset of data

### Comparison with Individual Scripts

| Feature | sync-all.ts | Individual Scripts |
|---------|-------------|-------------------|
| Convenience | ✅ One command | ❌ Three commands |
| Data merging | ✅ Built-in | ❌ Manual |
| Update-only mode | ✅ Yes | ⚠️ Partial |
| Flexible steps | ✅ Skip any step | ❌ Run all or nothing |
| Progress tracking | ✅ Unified | ❌ Separate |
| Error recovery | ✅ Continue pipeline | ❌ Stop at failure |

### Tips

1. **First run**: Use without limits to get all data
2. **Testing**: Use `--limit=10 --spotify-limit=5` for quick tests
3. **Incremental**: Use `--skip-scrape` if JSON files are already up-to-date
4. **Spotify quota**: Use `--skip-spotify` if hitting rate limits
5. **Debug**: Check `data/*.json` files to verify scraper output

---

## Other Scripts

### scraper-playground.ts
Individual scraper script with detailed output and storage options.

### seed-lineups.ts
Database seeding script that reads from JSON files.

### spotify-matcher.ts
Spotify matching script with more options (force re-match, specific band).

See individual script headers for detailed usage.
