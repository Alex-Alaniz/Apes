-- Create tournaments table for storing tournament metadata and assets
CREATE TABLE IF NOT EXISTS tournaments (
    id SERIAL PRIMARY KEY,
    tournament_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    prize_pool DECIMAL(15, 2) DEFAULT 0,
    max_participants INTEGER DEFAULT 10000,
    status VARCHAR(50) DEFAULT 'upcoming', -- upcoming, active, completed
    -- Assets JSON fields
    assets JSONB DEFAULT '{}', -- stores banner, icon
    team_logos JSONB DEFAULT '{}', -- stores team name -> logo URL mapping
    match_banners JSONB DEFAULT '{}', -- stores match ID -> banner URL mapping
    -- Metadata
    created_by VARCHAR(255), -- wallet address of creator
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_tournaments_id ON tournaments(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status);
CREATE INDEX IF NOT EXISTS idx_tournaments_dates ON tournaments(start_date, end_date);

-- Add trigger to update updated_at on changes
CREATE OR REPLACE FUNCTION update_tournaments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tournaments_updated_at_trigger
BEFORE UPDATE ON tournaments
FOR EACH ROW
EXECUTE FUNCTION update_tournaments_updated_at();

-- Insert default FIFA Club World Cup 2025 tournament
INSERT INTO tournaments (
    tournament_id,
    name,
    description,
    category,
    start_date,
    end_date,
    prize_pool,
    max_participants,
    status,
    assets
) VALUES (
    'club-world-cup-2025',
    'FIFA Club World Cup 2025',
    'Predict winners of the FIFA Club World Cup 2025 matches and compete for amazing prizes! The expanded tournament features 32 teams from around the world.',
    'Football',
    '2025-06-14 00:00:00',
    '2025-07-13 23:59:59',
    50000,
    10000,
    'upcoming',
    '{"banner": "https://images.unsplash.com/photo-1574629810360-7efbbe195018?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1893&q=80", "icon": "https://images.unsplash.com/photo-1574629810360-7efbbe195018?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1893&q=80"}'
) ON CONFLICT (tournament_id) DO NOTHING; 