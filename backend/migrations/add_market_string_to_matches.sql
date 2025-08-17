-- Add market_string column for on-chain bet identification
-- This string will be included in on-chain bets for precise match identification

ALTER TABLE cs2_matches 
ADD COLUMN IF NOT EXISTS market_string VARCHAR(100) UNIQUE;

-- Add index for fast lookups
CREATE INDEX IF NOT EXISTS idx_cs2_matches_market_string ON cs2_matches (market_string);

-- Add tournament metadata columns
ALTER TABLE parlay_tournaments
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE,
ADD COLUMN IF NOT EXISTS venue VARCHAR(255);

-- Update existing tournament with real data
UPDATE parlay_tournaments 
SET 
  description = 'Official CS2 tournament with real teams and accurate match data',
  start_date = '2025-08-20',
  end_date = '2025-08-24',
  venue = 'Boulevard Riyadh City, Riyadh, Saudi Arabia'
WHERE tournament_id = 'cs2-ewc-2025';

COMMENT ON COLUMN cs2_matches.market_string IS 'Unique identifier for on-chain bet inclusion (e.g., CS2_EWC2025_R16_VIT_VP_20AUG)';
COMMENT ON COLUMN parlay_tournaments.description IS 'Tournament description for UI display';
COMMENT ON COLUMN parlay_tournaments.venue IS 'Physical venue location';