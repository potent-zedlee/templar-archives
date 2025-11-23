-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tournaments table
CREATE TABLE tournaments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('WSOP', 'Triton', 'EPT', 'APL', 'Hustler Casino Live', 'WSOP Classic', 'GGPOKER')),
  category_logo TEXT,
  location TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sub Events table
CREATE TABLE sub_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  total_prize TEXT,
  winner TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Days table (video entries)
CREATE TABLE days (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sub_event_id UUID NOT NULL REFERENCES sub_events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  video_url TEXT,
  video_file TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hands table
CREATE TABLE hands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  day_id UUID NOT NULL REFERENCES days(id) ON DELETE CASCADE,
  number TEXT NOT NULL,
  description TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX idx_sub_events_tournament_id ON sub_events(tournament_id);
CREATE INDEX idx_days_sub_event_id ON days(sub_event_id);
CREATE INDEX idx_hands_day_id ON hands(day_id);
CREATE INDEX idx_tournaments_category ON tournaments(category);
CREATE INDEX idx_tournaments_dates ON tournaments(start_date, end_date);

-- Insert sample data
INSERT INTO tournaments (id, name, category, location, start_date, end_date)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '2025 WSOP Super Circuit Cyprus',
  'WSOP',
  'Limassol, Cyprus',
  '2025-03-15',
  '2025-03-25'
);

INSERT INTO sub_events (id, tournament_id, name, date, total_prize, winner)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'Main Event',
  '2025-03-20',
  '$10,000,000',
  'Daniel Negreanu'
);

INSERT INTO days (id, sub_event_id, name, video_url)
VALUES
  (
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000002',
    'Day1',
    'https://youtube.com/watch?v=example'
  ),
  (
    '00000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000002',
    'Day2',
    NULL
  ),
  (
    '00000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000002',
    'Day3',
    NULL
  );

INSERT INTO hands (day_id, number, description, timestamp, favorite)
VALUES
  ('00000000-0000-0000-0000-000000000003', '001', 'Daniel Negreanu AA / Phil Ivey KK', '05:11', TRUE),
  ('00000000-0000-0000-0000-000000000003', '002', 'Tom Dwan AK / Phil Hellmuth QQ', '12:34', FALSE),
  ('00000000-0000-0000-0000-000000000003', '003', 'Jennifer Harman JJ / Gus Hansen 99', '18:22', FALSE),
  ('00000000-0000-0000-0000-000000000003', '004', 'Antonio Esfandiari AQ / Patrik Antonius AJ', '24:15', TRUE);
