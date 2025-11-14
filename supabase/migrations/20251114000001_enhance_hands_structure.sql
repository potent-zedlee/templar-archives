-- ============================================================
-- Migration: Enhance hands table with blind and pot structure
-- Purpose: Add structured blind/ante and street-level pot tracking
-- Phase: 1 - Data Structure Enhancement
-- Author: Claude Code
-- Date: 2025-11-14
-- ============================================================

-- ============================================================
-- 1. Add blind and ante columns
-- ============================================================

ALTER TABLE hands
  ADD COLUMN IF NOT EXISTS small_blind INTEGER,
  ADD COLUMN IF NOT EXISTS big_blind INTEGER,
  ADD COLUMN IF NOT EXISTS ante INTEGER DEFAULT 0;

COMMENT ON COLUMN hands.small_blind IS 'Small blind amount (in chips)';
COMMENT ON COLUMN hands.big_blind IS 'Big blind amount (in chips)';
COMMENT ON COLUMN hands.ante IS 'Ante amount (in chips), default 0';

-- ============================================================
-- 2. Add street-level pot size columns
-- ============================================================

ALTER TABLE hands
  ADD COLUMN IF NOT EXISTS pot_preflop INTEGER,
  ADD COLUMN IF NOT EXISTS pot_flop INTEGER,
  ADD COLUMN IF NOT EXISTS pot_turn INTEGER,
  ADD COLUMN IF NOT EXISTS pot_river INTEGER;

COMMENT ON COLUMN hands.pot_preflop IS 'Pot size after preflop action';
COMMENT ON COLUMN hands.pot_flop IS 'Pot size after flop action';
COMMENT ON COLUMN hands.pot_turn IS 'Pot size after turn action';
COMMENT ON COLUMN hands.pot_river IS 'Pot size after river action (final pot)';

-- ============================================================
-- 3. Deprecate stakes column (keep for backward compatibility)
-- ============================================================

COMMENT ON COLUMN hands.stakes IS 'DEPRECATED: Use small_blind/big_blind/ante instead. Format: "50k/100k/100k"';

-- ============================================================
-- 4. Create indexes for efficient queries
-- ============================================================
-- Note: CONCURRENTLY cannot be used in migration pipeline
-- Indexes will be created without CONCURRENTLY

-- Partial index for non-null blind values (most common search)
CREATE INDEX IF NOT EXISTS idx_hands_blinds
  ON hands(big_blind, small_blind)
  WHERE big_blind IS NOT NULL;

-- Partial index for ante games
CREATE INDEX IF NOT EXISTS idx_hands_ante
  ON hands(ante)
  WHERE ante > 0;

-- Index for final pot size (river)
CREATE INDEX IF NOT EXISTS idx_hands_pot_river
  ON hands(pot_river DESC)
  WHERE pot_river IS NOT NULL;

-- Composite index for common filters (blinds + pot)
CREATE INDEX IF NOT EXISTS idx_hands_blinds_pot
  ON hands(big_blind, pot_river DESC)
  WHERE big_blind IS NOT NULL AND pot_river IS NOT NULL;

-- ============================================================
-- 5. Add check constraints for data integrity
-- ============================================================

ALTER TABLE hands DROP CONSTRAINT IF EXISTS check_hands_blind_positive;
ALTER TABLE hands
  ADD CONSTRAINT check_hands_blind_positive
  CHECK (
    (small_blind IS NULL OR small_blind > 0) AND
    (big_blind IS NULL OR big_blind > 0) AND
    (ante IS NULL OR ante >= 0)
  );

ALTER TABLE hands DROP CONSTRAINT IF EXISTS check_hands_blind_relationship;
ALTER TABLE hands
  ADD CONSTRAINT check_hands_blind_relationship
  CHECK (
    (small_blind IS NULL AND big_blind IS NULL) OR
    (small_blind IS NOT NULL AND big_blind IS NOT NULL AND small_blind <= big_blind)
  );

ALTER TABLE hands DROP CONSTRAINT IF EXISTS check_hands_pot_positive;
ALTER TABLE hands
  ADD CONSTRAINT check_hands_pot_positive
  CHECK (
    (pot_preflop IS NULL OR pot_preflop > 0) AND
    (pot_flop IS NULL OR pot_flop > 0) AND
    (pot_turn IS NULL OR pot_turn > 0) AND
    (pot_river IS NULL OR pot_river > 0)
  );

ALTER TABLE hands DROP CONSTRAINT IF EXISTS check_hands_pot_progression;
ALTER TABLE hands
  ADD CONSTRAINT check_hands_pot_progression
  CHECK (
    (pot_preflop IS NULL OR pot_flop IS NULL OR pot_flop >= pot_preflop) AND
    (pot_flop IS NULL OR pot_turn IS NULL OR pot_turn >= pot_flop) AND
    (pot_turn IS NULL OR pot_river IS NULL OR pot_river >= pot_turn)
  );

COMMENT ON CONSTRAINT check_hands_blind_positive ON hands IS
'Ensures blind/ante values are positive (ante can be 0).';

COMMENT ON CONSTRAINT check_hands_blind_relationship ON hands IS
'Ensures small blind is less than or equal to big blind when both exist.';

COMMENT ON CONSTRAINT check_hands_pot_positive ON hands IS
'Ensures pot sizes are positive.';

COMMENT ON CONSTRAINT check_hands_pot_progression ON hands IS
'Ensures pot size increases monotonically across streets.';

-- ============================================================
-- 6. Migration complete
-- ============================================================

-- Note: Existing 'stakes' column preserved for backward compatibility
-- Future: Migrate data from stakes → small_blind/big_blind/ante
