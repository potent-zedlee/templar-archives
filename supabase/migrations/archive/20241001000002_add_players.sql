-- Players table
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  photo_url TEXT,
  country TEXT,
  total_winnings BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hand players junction table (many-to-many relationship)
CREATE TABLE hand_players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hand_id UUID NOT NULL REFERENCES hands(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  position TEXT,
  cards TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(hand_id, player_id)
);

-- Indexes for better query performance
CREATE INDEX idx_hand_players_hand_id ON hand_players(hand_id);
CREATE INDEX idx_hand_players_player_id ON hand_players(player_id);
CREATE INDEX idx_players_name ON players(name);

-- Insert sample players
INSERT INTO players (id, name, photo_url, country, total_winnings)
VALUES
  ('10000000-0000-0000-0000-000000000001', 'Daniel Negreanu', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400', 'Canada', 42000000),
  ('10000000-0000-0000-0000-000000000002', 'Phil Ivey', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400', 'USA', 30000000),
  ('10000000-0000-0000-0000-000000000003', 'Tom Dwan', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400', 'USA', 18000000),
  ('10000000-0000-0000-0000-000000000004', 'Phil Hellmuth', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400', 'USA', 26000000),
  ('10000000-0000-0000-0000-000000000005', 'Jennifer Harman', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400', 'USA', 2800000),
  ('10000000-0000-0000-0000-000000000006', 'Gus Hansen', 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=400', 'Denmark', 12000000),
  ('10000000-0000-0000-0000-000000000007', 'Antonio Esfandiari', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400', 'USA', 27800000),
  ('10000000-0000-0000-0000-000000000008', 'Patrik Antonius', 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400', 'Finland', 12100000);

-- Link players to sample hands
INSERT INTO hand_players (hand_id, player_id, position, cards)
VALUES
  -- Hand 001: Daniel Negreanu AA / Phil Ivey KK
  ('00000000-0000-0000-0000-000000000003'::uuid, '10000000-0000-0000-0000-000000000001', 'BTN', 'AA'),
  ('00000000-0000-0000-0000-000000000003'::uuid, '10000000-0000-0000-0000-000000000002', 'BB', 'KK'),

  -- Hand 002: Tom Dwan AK / Phil Hellmuth QQ
  ('00000000-0000-0000-0000-000000000003'::uuid, '10000000-0000-0000-0000-000000000003', 'CO', 'AK'),
  ('00000000-0000-0000-0000-000000000003'::uuid, '10000000-0000-0000-0000-000000000004', 'SB', 'QQ'),

  -- Hand 003: Jennifer Harman JJ / Gus Hansen 99
  ('00000000-0000-0000-0000-000000000003'::uuid, '10000000-0000-0000-0000-000000000005', 'UTG', 'JJ'),
  ('00000000-0000-0000-0000-000000000003'::uuid, '10000000-0000-0000-0000-000000000006', 'MP', '99'),

  -- Hand 004: Antonio Esfandiari AQ / Patrik Antonius AJ
  ('00000000-0000-0000-0000-000000000003'::uuid, '10000000-0000-0000-0000-000000000007', 'HJ', 'AQ'),
  ('00000000-0000-0000-0000-000000000003'::uuid, '10000000-0000-0000-0000-000000000008', 'BTN', 'AJ');
