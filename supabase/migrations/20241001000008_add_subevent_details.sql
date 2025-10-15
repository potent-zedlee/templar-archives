-- Add detailed event information to sub_events table
ALTER TABLE sub_events ADD COLUMN IF NOT EXISTS buy_in TEXT;
ALTER TABLE sub_events ADD COLUMN IF NOT EXISTS entry_count INTEGER;
ALTER TABLE sub_events ADD COLUMN IF NOT EXISTS blind_structure TEXT;
ALTER TABLE sub_events ADD COLUMN IF NOT EXISTS level_duration INTEGER; -- 분 단위
ALTER TABLE sub_events ADD COLUMN IF NOT EXISTS starting_stack INTEGER;
ALTER TABLE sub_events ADD COLUMN IF NOT EXISTS notes TEXT;

-- Comments for documentation
COMMENT ON COLUMN sub_events.buy_in IS 'Buy-in amount (e.g., $10,000 + $400)';
COMMENT ON COLUMN sub_events.entry_count IS 'Number of entries/players';
COMMENT ON COLUMN sub_events.blind_structure IS 'Blind structure description';
COMMENT ON COLUMN sub_events.level_duration IS 'Level duration in minutes';
COMMENT ON COLUMN sub_events.starting_stack IS 'Starting chip stack';
COMMENT ON COLUMN sub_events.notes IS 'Additional notes or information';
