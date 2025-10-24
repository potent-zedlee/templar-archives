-- Add 20 Triton Poker Series tournaments with Main Event sub-events
-- Based on historical Triton tournament series from 2018-2025

-- Insert Tournaments
-- 2025 Tournaments
INSERT INTO tournaments (name, category, category_id, start_date, end_date, location, city, country, game_type)
VALUES
  ('Triton Jeju II', 'triton', 'triton', '2025-09-08', '2025-09-23', 'Jeju, South Korea', 'Jeju', 'South Korea', 'tournament'),
  ('Triton One', 'triton', 'triton', '2025-09-02', '2025-09-08', 'TBA', NULL, NULL, 'tournament'),
  ('Triton Montenegro', 'triton', 'triton', '2025-05-13', '2025-05-27', 'Budva, Montenegro', 'Budva', 'Montenegro', 'tournament'),
  ('Triton Jeju', 'triton', 'triton', '2025-02-26', '2025-03-15', 'Jeju, South Korea', 'Jeju', 'South Korea', 'tournament'),

-- 2024 Tournaments
  ('Triton Paradise', 'triton', 'triton', '2024-12-07', '2024-12-12', 'Nassau, Bahamas', 'Nassau', 'Bahamas', 'tournament'),
  ('Triton Monte-Carlo', 'triton', 'triton', '2024-11-01', '2024-11-14', 'Monaco', 'Monaco', 'Monaco', 'tournament'),
  ('Triton Montenegro', 'triton', 'triton', '2024-05-12', '2024-05-26', 'Budva, Montenegro', 'Budva', 'Montenegro', 'tournament'),
  ('Triton Jeju', 'triton', 'triton', '2024-03-05', '2024-03-21', 'Jeju, South Korea', 'Jeju', 'South Korea', 'tournament'),

-- 2023 Tournaments
  ('Triton Monte-Carlo', 'triton', 'triton', '2023-10-24', '2023-11-04', 'Monaco', 'Monaco', 'Monaco', 'tournament'),
  ('Triton London', 'triton', 'triton', '2023-07-27', '2023-08-10', 'London, United Kingdom', 'London', 'United Kingdom', 'tournament'),
  ('Triton Cyprus', 'triton', 'triton', '2023-05-10', '2023-05-25', 'Limassol, Cyprus', 'Limassol', 'Cyprus', 'tournament'),

-- 2022 Tournaments
  ('Triton Cyprus', 'triton', 'triton', '2022-09-05', '2022-09-17', 'Limassol, Cyprus', 'Limassol', 'Cyprus', 'tournament'),
  ('Triton Madrid', 'triton', 'triton', '2022-05-13', '2022-05-25', 'Madrid, Spain', 'Madrid', 'Spain', 'tournament'),
  ('Triton Cyprus', 'triton', 'triton', '2022-04-02', '2022-04-07', 'Limassol, Cyprus', 'Limassol', 'Cyprus', 'tournament'),

-- 2019 Tournaments
  ('Triton London', 'triton', 'triton', '2019-07-31', '2019-08-11', 'London, United Kingdom', 'London', 'United Kingdom', 'tournament'),
  ('Triton Montenegro', 'triton', 'triton', '2019-05-05', '2019-05-17', 'Budva, Montenegro', 'Budva', 'Montenegro', 'tournament'),
  ('Triton Jeju', 'triton', 'triton', '2019-03-02', '2019-03-09', 'Jeju, South Korea', 'Jeju', 'South Korea', 'tournament'),

-- 2018 Tournaments
  ('Triton Sochi', 'triton', 'triton', '2018-08-07', '2018-09-09', 'Sochi, Russia', 'Sochi', 'Russia', 'tournament'),
  ('Triton Jeju', 'triton', 'triton', '2018-07-23', '2018-08-01', 'Jeju, South Korea', 'Jeju', 'South Korea', 'tournament'),
  ('Triton Montenegro', 'triton', 'triton', '2018-05-12', '2018-05-18', 'Budva, Montenegro', 'Budva', 'Montenegro', 'tournament');

-- Insert Main Event sub-events for each tournament
-- We'll use a DO block to dynamically create sub-events for all Triton tournaments
DO $$
DECLARE
  tournament_record RECORD;
BEGIN
  -- Loop through all Triton tournaments and create Main Event sub-events
  FOR tournament_record IN
    SELECT id, name, start_date
    FROM tournaments
    WHERE category_id = 'triton'
    AND name LIKE 'Triton %'
    AND NOT EXISTS (
      SELECT 1 FROM sub_events WHERE tournament_id = tournaments.id
    )
  LOOP
    INSERT INTO sub_events (tournament_id, name, event_number, date)
    VALUES (
      tournament_record.id,
      'Main Event',
      'ME',
      tournament_record.start_date
    );
  END LOOP;
END $$;

-- Verify the insertions
SELECT
  t.name AS tournament_name,
  t.start_date,
  t.end_date,
  t.city,
  t.country,
  COUNT(se.id) AS subevent_count
FROM tournaments t
LEFT JOIN sub_events se ON t.id = se.tournament_id
WHERE t.category_id = 'triton' AND t.name LIKE 'Triton %'
GROUP BY t.id, t.name, t.start_date, t.end_date, t.city, t.country
ORDER BY t.start_date DESC;
