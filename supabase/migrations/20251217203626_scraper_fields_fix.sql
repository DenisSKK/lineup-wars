-- Add constraints and defaults to scraper-related columns for data integrity

-- Set defaults for array columns
ALTER TABLE bands ALTER COLUMN festival_urls SET DEFAULT '{}';
ALTER TABLE bands ALTER COLUMN spotify_genres SET DEFAULT '{}';

-- Add constraints for data integrity on bands table
-- Note: PostgreSQL doesn't support IF NOT EXISTS for ADD CONSTRAINT, so we check manually
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_spotify_popularity_range'
  ) THEN
    ALTER TABLE bands ADD CONSTRAINT chk_spotify_popularity_range 
      CHECK (spotify_popularity IS NULL OR (spotify_popularity >= 0 AND spotify_popularity <= 100));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_festival_urls_not_empty'
  ) THEN
    ALTER TABLE bands ADD CONSTRAINT chk_festival_urls_not_empty 
      CHECK (festival_urls IS NULL OR array_length(festival_urls, 1) > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_spotify_url_format'
  ) THEN
    ALTER TABLE bands ADD CONSTRAINT chk_spotify_url_format 
      CHECK (spotify_url IS NULL OR spotify_url ~* '^https://open\.spotify\.com/');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_source_url_not_empty'
  ) THEN
    ALTER TABLE lineups ADD CONSTRAINT chk_source_url_not_empty 
      CHECK (source_url IS NULL OR length(trim(source_url)) > 0);
  END IF;
END $$;
