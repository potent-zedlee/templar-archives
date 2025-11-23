-- KAN (Khalai Archive Network) Integration
-- This migration adds KAN-specific tables and extends existing schema for automated video analysis

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS pg_trgm; -- For trigram search on player names

-- ============================================================================
-- 1. Videos Table (KAN-specific)
-- ============================================================================
-- Stores YouTube video metadata for analysis (separate from streams table)
CREATE TABLE IF NOT EXISTS videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Video information
  url TEXT NOT NULL UNIQUE,
  youtube_id TEXT UNIQUE,
  platform TEXT NOT NULL DEFAULT 'youtube',
  title TEXT,
  description TEXT,
  duration INTEGER, -- seconds
  thumbnail_url TEXT,
  published_at TIMESTAMPTZ,
  channel_name TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_videos_url ON videos(url);
CREATE INDEX IF NOT EXISTS idx_videos_youtube_id ON videos(youtube_id);
CREATE INDEX IF NOT EXISTS idx_videos_platform ON videos(platform);
CREATE INDEX IF NOT EXISTS idx_videos_created_at ON videos(created_at DESC);

-- RLS Policies
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read videos" ON videos
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert videos" ON videos
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update videos" ON videos
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Update trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_videos_updated_at
  BEFORE UPDATE ON videos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE videos IS 'YouTube video metadata for KAN analysis (separate from streams)';
COMMENT ON COLUMN videos.youtube_id IS 'YouTube video ID extracted from URL';

-- ============================================================================
-- 2. Analysis Jobs Table (KAN-specific)
-- ============================================================================
-- Tracks video analysis job status and progress
CREATE TABLE IF NOT EXISTS analysis_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  stream_id UUID REFERENCES streams(id) ON DELETE CASCADE,

  -- Analysis configuration
  platform TEXT NOT NULL DEFAULT 'triton',
  ai_provider TEXT NOT NULL,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending',
  progress INTEGER DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),

  -- Input data
  segments JSONB NOT NULL, -- Video segments to analyze
  submitted_players TEXT[], -- Player names submitted by user

  -- Results
  hands_found INTEGER,
  error_message TEXT,
  error_details JSONB,

  -- AI metadata
  ai_model TEXT,
  tokens_used INTEGER,
  processing_time INTEGER, -- seconds

  -- Timestamps
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT analysis_jobs_status_check
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  CONSTRAINT analysis_jobs_platform_check
    CHECK (platform IN ('triton', 'pokerstars', 'wsop', 'hustler')),
  CONSTRAINT analysis_jobs_ai_provider_check
    CHECK (ai_provider IN ('claude', 'gemini')),
  CONSTRAINT analysis_jobs_video_or_stream_check
    CHECK (video_id IS NOT NULL OR stream_id IS NOT NULL)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_video_id ON analysis_jobs(video_id);
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_stream_id ON analysis_jobs(stream_id);
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_status ON analysis_jobs(status);
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_created_at ON analysis_jobs(created_at DESC);

-- RLS Policies
ALTER TABLE analysis_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read jobs" ON analysis_jobs
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create jobs" ON analysis_jobs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update jobs" ON analysis_jobs
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Update trigger
CREATE TRIGGER update_analysis_jobs_updated_at
  BEFORE UPDATE ON analysis_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE analysis_jobs IS 'KAN video analysis job tracking and status';
COMMENT ON COLUMN analysis_jobs.segments IS 'JSON array of video segments: [{start: 30, end: 900, type: "gameplay"}]';
COMMENT ON COLUMN analysis_jobs.submitted_players IS 'Player names submitted for matching AI-extracted names';

-- ============================================================================
-- 3. Extend Existing Tables for KAN
-- ============================================================================

-- Extend players table
DO $$
BEGIN
  -- Add normalized_name for fast matching
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='players' AND column_name='normalized_name') THEN
    ALTER TABLE players ADD COLUMN normalized_name TEXT;
  END IF;

  -- Add aliases array
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='players' AND column_name='aliases') THEN
    ALTER TABLE players ADD COLUMN aliases TEXT[];
  END IF;

  -- Add is_pro flag
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='players' AND column_name='is_pro') THEN
    ALTER TABLE players ADD COLUMN is_pro BOOLEAN DEFAULT false;
  END IF;

  -- Add bio
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='players' AND column_name='bio') THEN
    ALTER TABLE players ADD COLUMN bio TEXT;
  END IF;
END $$;

-- Create unique index on normalized_name if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_players_normalized_name') THEN
    -- First populate normalized_name from existing names
    UPDATE players SET normalized_name = LOWER(REGEXP_REPLACE(name, '[^a-z0-9]', '', 'gi')) WHERE normalized_name IS NULL;

    -- Make it NOT NULL
    ALTER TABLE players ALTER COLUMN normalized_name SET NOT NULL;

    -- Create unique index
    CREATE UNIQUE INDEX idx_players_normalized_name ON players(normalized_name);
  END IF;
END $$;

-- Extend hands table
DO $$
BEGIN
  -- Add job_id reference
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='hands' AND column_name='job_id') THEN
    ALTER TABLE hands ADD COLUMN job_id UUID REFERENCES analysis_jobs(id) ON DELETE SET NULL;
  END IF;

  -- Add video timestamps
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='hands' AND column_name='video_timestamp_start') THEN
    ALTER TABLE hands ADD COLUMN video_timestamp_start INTEGER; -- seconds
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='hands' AND column_name='video_timestamp_end') THEN
    ALTER TABLE hands ADD COLUMN video_timestamp_end INTEGER; -- seconds
  END IF;

  -- Add structured board cards (KAN uses array format)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='hands' AND column_name='board_flop') THEN
    ALTER TABLE hands ADD COLUMN board_flop TEXT[]; -- ["As", "Kh", "Qd"]
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='hands' AND column_name='board_turn') THEN
    ALTER TABLE hands ADD COLUMN board_turn TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='hands' AND column_name='board_river') THEN
    ALTER TABLE hands ADD COLUMN board_river TEXT;
  END IF;

  -- Add stakes
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='hands' AND column_name='stakes') THEN
    ALTER TABLE hands ADD COLUMN stakes TEXT;
  END IF;

  -- Add raw_data for AI output
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='hands' AND column_name='raw_data') THEN
    ALTER TABLE hands ADD COLUMN raw_data JSONB;
  END IF;
END $$;

-- Create index on job_id
CREATE INDEX IF NOT EXISTS idx_hands_job_id ON hands(job_id);

-- Extend hand_players table
DO $$
BEGIN
  -- Add seat number (1-9 for 9-max)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='hand_players' AND column_name='seat') THEN
    ALTER TABLE hand_players ADD COLUMN seat INTEGER CHECK (seat BETWEEN 1 AND 9);
  END IF;

  -- Add hole_cards array (for structured format)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='hand_players' AND column_name='hole_cards') THEN
    ALTER TABLE hand_players ADD COLUMN hole_cards TEXT[]; -- ["As", "Kd"]
  END IF;

  -- Add final_amount (winnings)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='hand_players' AND column_name='final_amount') THEN
    ALTER TABLE hand_players ADD COLUMN final_amount BIGINT DEFAULT 0;
  END IF;

  -- Add is_winner flag
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='hand_players' AND column_name='is_winner') THEN
    ALTER TABLE hand_players ADD COLUMN is_winner BOOLEAN DEFAULT false;
  END IF;

  -- Add hand_description (e.g., "Full House, Aces over Kings")
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='hand_players' AND column_name='hand_description') THEN
    ALTER TABLE hand_players ADD COLUMN hand_description TEXT;
  END IF;

  -- Rename position to poker_position if needed (avoid conflict)
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name='hand_players' AND column_name='position') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='hand_players' AND column_name='poker_position') THEN
      ALTER TABLE hand_players RENAME COLUMN position TO poker_position;
    END IF;
  ELSE
    -- Add poker_position if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='hand_players' AND column_name='poker_position') THEN
      ALTER TABLE hand_players ADD COLUMN poker_position TEXT; -- BTN, SB, BB, UTG, MP, CO, HJ
    END IF;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_hand_players_seat ON hand_players(hand_id, seat);
CREATE INDEX IF NOT EXISTS idx_hand_players_is_winner ON hand_players(hand_id) WHERE is_winner = true;

-- Comments
COMMENT ON COLUMN players.normalized_name IS 'Lowercase, alphanumeric only - for fast AI name matching';
COMMENT ON COLUMN players.aliases IS 'Alternative names/spellings for player matching';
COMMENT ON COLUMN hands.job_id IS 'Reference to analysis job that created this hand';
COMMENT ON COLUMN hands.video_timestamp_start IS 'Start time in video (seconds)';
COMMENT ON COLUMN hands.video_timestamp_end IS 'End time in video (seconds)';
COMMENT ON COLUMN hands.board_flop IS 'Flop cards as array: ["As", "Kh", "Qd"]';
COMMENT ON COLUMN hands.board_turn IS 'Turn card: "7c"';
COMMENT ON COLUMN hands.board_river IS 'River card: "3s"';
COMMENT ON COLUMN hands.stakes IS 'Blinds/antes: "50k/100k/100k"';
COMMENT ON COLUMN hands.raw_data IS 'Full AI extraction output (JSON)';
COMMENT ON COLUMN hand_players.seat IS 'Seat number (1-9 for 9-max tables)';
COMMENT ON COLUMN hand_players.hole_cards IS 'Hole cards as array: ["As", "Kd"]';
COMMENT ON COLUMN hand_players.final_amount IS 'Amount won/lost in this hand';
COMMENT ON COLUMN hand_players.is_winner IS 'True if player won the pot';
COMMENT ON COLUMN hand_players.hand_description IS 'Winning hand description (e.g., "Flush, Ace high")';
COMMENT ON COLUMN hand_players.poker_position IS 'Position: BTN, SB, BB, UTG, MP, CO, HJ';

-- ============================================================================
-- 4. Update Functions
-- ============================================================================

-- Function to normalize player name (for matching)
CREATE OR REPLACE FUNCTION normalize_player_name(name TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN LOWER(REGEXP_REPLACE(name, '[^a-z0-9]', '', 'gi'));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION normalize_player_name IS 'Normalize player name for AI matching (lowercase, alphanumeric only)';

-- Trigger to auto-populate normalized_name on players insert/update
CREATE OR REPLACE FUNCTION auto_normalize_player_name()
RETURNS TRIGGER AS $$
BEGIN
  NEW.normalized_name := normalize_player_name(NEW.name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_normalize_player_name ON players;
CREATE TRIGGER trigger_auto_normalize_player_name
  BEFORE INSERT OR UPDATE OF name ON players
  FOR EACH ROW
  EXECUTE FUNCTION auto_normalize_player_name();

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- Summary:
-- 1. Added `videos` table for HAE video metadata
-- 2. Added `analysis_jobs` table for tracking video analysis
-- 3. Extended `players` table with normalized_name, aliases, is_pro, bio
-- 4. Extended `hands` table with job_id, timestamps, structured board cards, stakes
-- 5. Extended `hand_players` table with seat, hole_cards, final_amount, is_winner
-- 6. Added helper functions and triggers for player name normalization
