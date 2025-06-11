-- Create tournament_participants table
CREATE TABLE IF NOT EXISTS tournament_participants (
    id SERIAL PRIMARY KEY,
    tournament_id VARCHAR(255) NOT NULL,
    user_address VARCHAR(255) NOT NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tournament_id, user_address)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_tournament_participants_tournament ON tournament_participants(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_participants_user ON tournament_participants(user_address);

-- Add tournament_id column to markets table if it doesn't exist
ALTER TABLE markets ADD COLUMN IF NOT EXISTS tournament_id VARCHAR(255);

-- Add index for tournament markets
CREATE INDEX IF NOT EXISTS idx_markets_tournament ON markets(tournament_id); 