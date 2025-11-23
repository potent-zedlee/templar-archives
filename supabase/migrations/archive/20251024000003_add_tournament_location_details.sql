-- Add city and country fields to tournaments table for detailed location info

-- Add city and country columns
ALTER TABLE public.tournaments
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS country TEXT;

-- Create indexes for location-based queries
CREATE INDEX IF NOT EXISTS idx_tournaments_city
ON public.tournaments(city);

CREATE INDEX IF NOT EXISTS idx_tournaments_country
ON public.tournaments(country);

-- Add comments
COMMENT ON COLUMN public.tournaments.city IS 'City where the tournament takes place (e.g., Las Vegas, Macau, Paris)';
COMMENT ON COLUMN public.tournaments.country IS 'Country code or name (e.g., USA, CHN, FRA)';

-- Migrate existing location data (example: "Las Vegas" → city: "Las Vegas", keep location for backward compatibility)
-- Note: This is a placeholder migration. Real data migration should be done manually or with a script.
