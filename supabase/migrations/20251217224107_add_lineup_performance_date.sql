-- Add performance_date column to lineups table
-- This will store the actual date of the performance, parsed from day_label

ALTER TABLE lineups ADD COLUMN IF NOT EXISTS performance_date DATE;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_lineups_performance_date ON lineups(performance_date);

-- Add index on festival_id and performance_date combination for efficient queries
CREATE INDEX IF NOT EXISTS idx_lineups_festival_performance ON lineups(festival_id, performance_date);
