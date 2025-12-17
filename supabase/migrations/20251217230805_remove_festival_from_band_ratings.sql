-- Remove festival_id from band_ratings table
-- A user's rating for a band should be universal, not festival-specific

-- Step 1: Drop the existing unique constraint that includes festival_id
ALTER TABLE band_ratings DROP CONSTRAINT IF EXISTS band_ratings_user_id_band_id_festival_id_key;

-- Step 2: Drop the index on festival_id
DROP INDEX IF EXISTS idx_band_ratings_festival_id;

-- Step 3: Remove the festival_id column
ALTER TABLE band_ratings DROP COLUMN IF EXISTS festival_id;

-- Step 4: Add new unique constraint on (user_id, band_id)
ALTER TABLE band_ratings ADD CONSTRAINT band_ratings_user_id_band_id_key UNIQUE(user_id, band_id);
