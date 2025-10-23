-- Add event_number field to sub_events table
-- Supports both sequential numbering (Event #1, #2) and official event codes (WSOP Event #15)
ALTER TABLE sub_events ADD COLUMN IF NOT EXISTS event_number TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_sub_events_event_number ON sub_events(event_number) WHERE event_number IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN sub_events.event_number IS 'Event number or identifier (e.g., "#1", "Event #15", "1A"). Supports both sequential numbering and official event codes.';
