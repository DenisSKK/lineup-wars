# Spotify Band Matcher

This script automatically matches bands in your database with their Spotify artist profiles and enriches your data with Spotify information.

## Features

- 🔍 Searches Spotify for each band by name
- 🎯 Intelligent matching (prefers exact name matches, falls back to most popular)
- 📊 Updates database with:
  - Spotify Artist ID
  - Spotify URL
  - Artist image URL (high quality)
  - Popularity score (0-100)
  - Genre tags
- ⚡ Rate limiting protection
- 🔄 Retry logic for API errors
- 📈 Progress tracking and detailed summary

## Setup

### 1. Get Spotify API Credentials

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Log in with your Spotify account (or create one)
3. Click "Create app"
4. Fill in the form:
   - **App name**: Lineup Wars Band Matcher
   - **App description**: Match festival bands with Spotify profiles
   - **Redirect URI**: http://localhost (not used, but required)
   - **API**: Select "Web API"
5. Accept terms and click "Save"
6. Click "Settings"
7. Copy your **Client ID** and **Client Secret**

### 2. Add Credentials to Environment

Add these to your `.env.local` file:

```env
SPOTIFY_CLIENT_ID=your_client_id_here
SPOTIFY_CLIENT_SECRET=your_client_secret_here
```

## Usage

### Match all bands without Spotify data

```bash
npm run spotify:match
```

This will process all bands in your database that don't have a `spotify_id` yet.

### Match a limited number of bands

```bash
npm run spotify:match -- --limit=50
```

Useful for testing or processing in batches.

### Force re-match all bands

```bash
npm run spotify:match -- --force
```

This will re-match ALL bands, even those that already have Spotify data (overwrites existing data).

### Match a specific band

```bash
npm run spotify:match -- --band="Metallica"
```

Useful for fixing individual bands or testing the matcher.

### Combine options

```bash
npm run spotify:match -- --force --limit=100
```

## How It Works

1. **Authentication**: Gets an access token from Spotify using Client Credentials flow
2. **Fetch Bands**: Retrieves bands from database based on options
3. **Search**: For each band, searches Spotify's artist database
4. **Match**: Finds the best match (exact name or most popular)
5. **Update**: Saves Spotify data to database
6. **Summary**: Shows statistics about matches, misses, and errors

## Matching Strategy

The script uses a smart matching strategy:

1. Searches Spotify for up to 5 artist results
2. Looks for an **exact name match** (case-insensitive)
3. If no exact match, picks the **most popular artist**

This ensures accurate matches while handling minor variations in artist names.

## Rate Limiting

- Waits 100ms between requests to respect Spotify's API
- Automatically handles 429 rate limit responses
- Retries after the specified wait time

## Output Example

```
🎵 Spotify Band Matcher

🔐 Authenticating with Spotify API...
✅ Authentication successful

📋 Fetching bands from database...
📊 Found 150 band(s) to process

[1/150] Searching for "Metallica"...
  ✅ Matched: Metallica (popularity: 89, genres: thrash metal, metal, rock)
[2/150] Searching for "Unknown Local Band"...
  ❌ Not found on Spotify
[3/150] Searching for "Slipknot"...
  ✅ Matched: Slipknot (popularity: 85, genres: alternative metal, nu metal)
...

==================================================
📊 Summary:
  ✅ Matched: 142
  ❌ Not found: 7
  ⚠️  Errors: 1
  📈 Total processed: 150
==================================================

✨ Done!
```

## Database Schema

The script updates the following columns in the `bands` table:

- `spotify_id` - Unique Spotify artist ID
- `spotify_url` - Direct link to artist on Spotify
- `spotify_image_url` - High-quality artist image
- `spotify_popularity` - Popularity score (0-100)
- `spotify_genres` - Array of genre tags
- `updated_at` - Timestamp of the update

## Troubleshooting

### "Missing Spotify credentials" error

Make sure you've added `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` to your `.env.local` file.

### Rate limiting

If you hit rate limits frequently, the script will automatically wait and retry. For large batches, consider using `--limit` to process in smaller chunks.

### No matches found

Some bands might not be on Spotify, especially:
- Very local/underground bands
- DJ sets that aren't registered as artists
- Bands with unusual character encodings

### Wrong artist matched

If the script matches the wrong artist (e.g., a different band with the same name), you can:
1. Manually update the database
2. Run with `--band="Artist Name"` and check the results
3. Consider adding additional matching logic for specific cases

## Integration with Scrapers

This script is designed to work with the lineup scraper:

1. **Scraper** adds bands to database (without Spotify data)
2. **Spotify Matcher** enriches bands with Spotify data
3. **Cron job** can run both periodically to keep data fresh

Example cron workflow:
```bash
# 1. Scrape new lineups (adds new bands)
npm run scraper:playground

# 2. Match any new bands with Spotify
npm run spotify:match
```

## Future Enhancements

- [ ] Add confidence scores for fuzzy matching
- [ ] Support for manually specifying Spotify IDs
- [ ] Batch processing with progress saving
- [ ] Export unmatched bands for manual review
- [ ] Integration with MusicBrainz for additional metadata
