-- Sample data for testing Lineup Wars application
-- Run this after running schema.sql to populate the database with test data

-- Insert sample festivals
INSERT INTO festivals (name, year, location, description) VALUES
  ('Rock For People', 2024, 'Hradec Králové, Czech Republic', 'One of the largest music festivals in Central Europe, featuring rock, metal, and alternative music'),
  ('Nova Rock', 2024, 'Nickelsdorf, Austria', 'Austria''s biggest rock and metal festival, held annually on the Pannonian Fields');

-- Insert sample bands
INSERT INTO bands (name, genre, country, description) VALUES
  ('Metallica', 'Heavy Metal', 'USA', 'American heavy metal band formed in 1981'),
  ('Foo Fighters', 'Rock', 'USA', 'American rock band formed by former Nirvana drummer Dave Grohl'),
  ('Green Day', 'Punk Rock', 'USA', 'American punk rock band formed in 1987'),
  ('The Offspring', 'Punk Rock', 'USA', 'American punk rock band from Garden Grove, California'),
  ('Bring Me The Horizon', 'Metalcore', 'UK', 'British rock band formed in Sheffield in 2004'),
  ('Billy Talent', 'Punk Rock', 'Canada', 'Canadian punk rock band formed in 1993'),
  ('Rise Against', 'Punk Rock', 'USA', 'American punk rock band from Chicago'),
  ('Architects', 'Metalcore', 'UK', 'British metalcore band from Brighton'),
  ('Parkway Drive', 'Metalcore', 'Australia', 'Australian metalcore band from Byron Bay'),
  ('A Day To Remember', 'Metalcore', 'USA', 'American rock band from Ocala, Florida'),
  ('Sleeping With Sirens', 'Post-Hardcore', 'USA', 'American rock band from Orlando, Florida'),
  ('Pierce The Veil', 'Post-Hardcore', 'USA', 'American rock band from San Diego, California');

-- Get festival IDs (you'll need to replace these with actual UUIDs from your database)
-- Run this query first to get the IDs:
-- SELECT id, name FROM festivals;

-- Then use the actual IDs in the lineups insertion below
-- Example format (replace the UUIDs with your actual festival and band IDs):

-- For Rock For People 2024
-- INSERT INTO lineups (festival_id, band_id, day_number, stage) VALUES
--   ('festival-uuid-1', 'band-uuid-metallica', 1, 'Main Stage'),
--   ('festival-uuid-1', 'band-uuid-foofighters', 1, 'Main Stage'),
--   ('festival-uuid-1', 'band-uuid-greenday', 2, 'Main Stage'),
--   ('festival-uuid-1', 'band-uuid-offspring', 2, 'Second Stage'),
--   ('festival-uuid-1', 'band-uuid-bringmethehorizon', 3, 'Main Stage'),
--   ('festival-uuid-1', 'band-uuid-billytalent', 3, 'Second Stage');

-- For Nova Rock 2024
-- INSERT INTO lineups (festival_id, band_id, day_number, stage) VALUES
--   ('festival-uuid-2', 'band-uuid-greenday', 1, 'Main Stage'),
--   ('festival-uuid-2', 'band-uuid-riseagainst', 1, 'Second Stage'),
--   ('festival-uuid-2', 'band-uuid-architects', 2, 'Main Stage'),
--   ('festival-uuid-2', 'band-uuid-parkwaydrive', 2, 'Second Stage'),
--   ('festival-uuid-2', 'band-uuid-adaytoremember', 3, 'Main Stage'),
--   ('festival-uuid-2', 'band-uuid-piercetheveil', 3, 'Second Stage');

-- Helper query to get all band and festival IDs for easier lineup insertion:
-- SELECT 'Festival: ' || f.name || ' (' || f.id || ')' FROM festivals f
-- UNION ALL
-- SELECT 'Band: ' || b.name || ' (' || b.id || ')' FROM bands b
-- ORDER BY 1;

-- After running the above and getting your UUIDs, you can create a proper insert statement.
-- Here's a template using CTEs to make it easier:

WITH festival_ids AS (
  SELECT id, name FROM festivals
),
band_ids AS (
  SELECT id, name FROM bands
)
INSERT INTO lineups (festival_id, band_id, day_number, stage)
SELECT 
  (SELECT id FROM festival_ids WHERE name = 'Rock For People'),
  (SELECT id FROM band_ids WHERE name = 'Metallica'),
  1,
  'Main Stage'
UNION ALL
SELECT 
  (SELECT id FROM festival_ids WHERE name = 'Rock For People'),
  (SELECT id FROM band_ids WHERE name = 'Foo Fighters'),
  1,
  'Main Stage'
UNION ALL
SELECT 
  (SELECT id FROM festival_ids WHERE name = 'Rock For People'),
  (SELECT id FROM band_ids WHERE name = 'Green Day'),
  2,
  'Main Stage'
UNION ALL
SELECT 
  (SELECT id FROM festival_ids WHERE name = 'Rock For People'),
  (SELECT id FROM band_ids WHERE name = 'The Offspring'),
  2,
  'Second Stage'
UNION ALL
SELECT 
  (SELECT id FROM festival_ids WHERE name = 'Rock For People'),
  (SELECT id FROM band_ids WHERE name = 'Bring Me The Horizon'),
  3,
  'Main Stage'
UNION ALL
SELECT 
  (SELECT id FROM festival_ids WHERE name = 'Rock For People'),
  (SELECT id FROM band_ids WHERE name = 'Billy Talent'),
  3,
  'Second Stage'
UNION ALL
SELECT 
  (SELECT id FROM festival_ids WHERE name = 'Nova Rock'),
  (SELECT id FROM band_ids WHERE name = 'Green Day'),
  1,
  'Main Stage'
UNION ALL
SELECT 
  (SELECT id FROM festival_ids WHERE name = 'Nova Rock'),
  (SELECT id FROM band_ids WHERE name = 'Rise Against'),
  1,
  'Second Stage'
UNION ALL
SELECT 
  (SELECT id FROM festival_ids WHERE name = 'Nova Rock'),
  (SELECT id FROM band_ids WHERE name = 'Architects'),
  2,
  'Main Stage'
UNION ALL
SELECT 
  (SELECT id FROM festival_ids WHERE name = 'Nova Rock'),
  (SELECT id FROM band_ids WHERE name = 'Parkway Drive'),
  2,
  'Second Stage'
UNION ALL
SELECT 
  (SELECT id FROM festival_ids WHERE name = 'Nova Rock'),
  (SELECT id FROM band_ids WHERE name = 'A Day To Remember'),
  3,
  'Main Stage'
UNION ALL
SELECT 
  (SELECT id FROM festival_ids WHERE name = 'Nova Rock'),
  (SELECT id FROM band_ids WHERE name = 'Pierce The Veil'),
  3,
  'Second Stage';
