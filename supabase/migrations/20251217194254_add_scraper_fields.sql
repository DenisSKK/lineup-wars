-- Add scraper-related columns for lineup ingestion

-- Bands enrichment
ALTER TABLE bands ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE bands ADD COLUMN IF NOT EXISTS festival_urls TEXT[];
ALTER TABLE bands ADD COLUMN IF NOT EXISTS spotify_id TEXT;
ALTER TABLE bands ADD COLUMN IF NOT EXISTS spotify_url TEXT;
ALTER TABLE bands ADD COLUMN IF NOT EXISTS spotify_image_url TEXT;
ALTER TABLE bands ADD COLUMN IF NOT EXISTS spotify_popularity INTEGER;
ALTER TABLE bands ADD COLUMN IF NOT EXISTS spotify_genres TEXT[];

CREATE INDEX IF NOT EXISTS idx_bands_slug ON bands(slug);
CREATE INDEX IF NOT EXISTS idx_bands_spotify_id ON bands(spotify_id);

-- Lineup metadata scraped from festival pages
ALTER TABLE lineups ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE lineups ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE lineups ADD COLUMN IF NOT EXISTS day_label TEXT;
ALTER TABLE lineups ADD COLUMN IF NOT EXISTS stage_label TEXT;
ALTER TABLE lineups ADD COLUMN IF NOT EXISTS time_label TEXT;
