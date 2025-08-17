-- CS2 Esports World Cup 2025 Parlay Tournament Schema

-- Create parlay tournaments table
CREATE TABLE IF NOT EXISTS parlay_tournaments (
    id SERIAL PRIMARY KEY,
    tournament_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) DEFAULT 'Esports',
    game VARCHAR(100) DEFAULT 'CS2',
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    min_selections INTEGER DEFAULT 2, -- Minimum matches to select for parlay
    max_selections INTEGER DEFAULT 10, -- Maximum matches to select for parlay
    base_multiplier DECIMAL(10, 4) DEFAULT 1.0, -- Base odds multiplier
    multiplier_increment DECIMAL(10, 4) DEFAULT 0.5, -- Additional multiplier per selection
    prize_pool DECIMAL(20, 6) DEFAULT 0, -- In APES tokens
    entry_fee DECIMAL(20, 6) DEFAULT 0, -- Entry fee per parlay in APES
    total_volume DECIMAL(20, 6) DEFAULT 0, -- Total betting volume in APES
    status VARCHAR(50) DEFAULT 'upcoming', -- upcoming, active, completed
    rules JSONB DEFAULT '{}', -- Tournament specific rules
    assets JSONB DEFAULT '{}', -- Tournament images/logos
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create CS2 matches table
CREATE TABLE IF NOT EXISTS cs2_matches (
    id SERIAL PRIMARY KEY,
    match_id VARCHAR(255) UNIQUE NOT NULL,
    tournament_id VARCHAR(255) REFERENCES parlay_tournaments(tournament_id),
    round VARCHAR(100), -- Group Stage, Playoffs, Quarter Finals, etc
    team_a VARCHAR(255) NOT NULL,
    team_b VARCHAR(255) NOT NULL,
    team_a_logo TEXT,
    team_b_logo TEXT,
    match_date TIMESTAMP,
    venue VARCHAR(255),
    status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, live, completed
    winner VARCHAR(255), -- team_a, team_b, or null
    score_a INTEGER,
    score_b INTEGER,
    best_of INTEGER DEFAULT 3, -- BO1, BO3, BO5
    match_details JSONB DEFAULT '{}', -- Additional match data
    liquipedia_url TEXT,
    hltv_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create parlay bets table
CREATE TABLE IF NOT EXISTS parlay_bets (
    id SERIAL PRIMARY KEY,
    bet_id VARCHAR(255) UNIQUE NOT NULL,
    tournament_id VARCHAR(255) REFERENCES parlay_tournaments(tournament_id),
    user_address VARCHAR(44) NOT NULL,
    selections JSONB NOT NULL, -- Array of {match_id, selected_team}
    selection_count INTEGER NOT NULL,
    stake_amount DECIMAL(20, 6) NOT NULL, -- APES tokens
    total_multiplier DECIMAL(10, 4) NOT NULL, -- Combined odds
    potential_payout DECIMAL(20, 6) NOT NULL, -- stake * multiplier
    status VARCHAR(50) DEFAULT 'pending', -- pending, won, lost, partially_resolved
    winning_count INTEGER DEFAULT 0, -- Number of correct predictions
    resolved_count INTEGER DEFAULT 0, -- Number of resolved matches
    transaction_signature VARCHAR(88),
    placed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    payout_signature VARCHAR(88),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create parlay bet selections table (normalized)
CREATE TABLE IF NOT EXISTS parlay_bet_selections (
    id SERIAL PRIMARY KEY,
    bet_id VARCHAR(255) REFERENCES parlay_bets(bet_id),
    match_id VARCHAR(255) REFERENCES cs2_matches(match_id),
    selected_team VARCHAR(255) NOT NULL,
    is_correct BOOLEAN,
    match_resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create parlay leaderboard view
CREATE OR REPLACE VIEW parlay_leaderboard AS
WITH user_stats AS (
    SELECT 
        pb.user_address,
        COUNT(DISTINCT pb.id) as total_parlays,
        COUNT(DISTINCT CASE WHEN pb.status = 'won' THEN pb.id END) as winning_parlays,
        SUM(pb.stake_amount) as total_staked,
        SUM(CASE WHEN pb.status = 'won' THEN pb.potential_payout - pb.stake_amount ELSE 0 END) as total_profit,
        AVG(pb.selection_count) as avg_selections,
        MAX(pb.potential_payout) as biggest_potential_win,
        MAX(CASE WHEN pb.status = 'won' THEN pb.potential_payout ELSE 0 END) as biggest_actual_win
    FROM parlay_bets pb
    WHERE pb.tournament_id = 'cs2-ewc-2025'
    GROUP BY pb.user_address
)
SELECT 
    us.*,
    u.username,
    u.twitter_username,
    CASE 
        WHEN us.total_parlays > 0 
        THEN (us.winning_parlays::DECIMAL / us.total_parlays * 100)
        ELSE 0 
    END as win_rate,
    RANK() OVER (ORDER BY us.total_profit DESC) as profit_rank,
    RANK() OVER (ORDER BY us.winning_parlays DESC) as wins_rank,
    RANK() OVER (ORDER BY us.total_staked DESC) as volume_rank
FROM user_stats us
LEFT JOIN users u ON us.user_address = u.wallet_address
ORDER BY us.total_profit DESC;

-- Create indexes
CREATE INDEX idx_parlay_tournaments_id ON parlay_tournaments(tournament_id);
CREATE INDEX idx_cs2_matches_tournament ON cs2_matches(tournament_id);
CREATE INDEX idx_cs2_matches_status ON cs2_matches(status);
CREATE INDEX idx_parlay_bets_user ON parlay_bets(user_address);
CREATE INDEX idx_parlay_bets_tournament ON parlay_bets(tournament_id);
CREATE INDEX idx_parlay_bets_status ON parlay_bets(status);
CREATE INDEX idx_parlay_bet_selections_bet ON parlay_bet_selections(bet_id);
CREATE INDEX idx_parlay_bet_selections_match ON parlay_bet_selections(match_id);

-- Update triggers
CREATE TRIGGER update_parlay_tournaments_updated_at
BEFORE UPDATE ON parlay_tournaments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cs2_matches_updated_at
BEFORE UPDATE ON cs2_matches
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Insert CS2 Esports World Cup 2025 tournament
INSERT INTO parlay_tournaments (
    tournament_id,
    name,
    description,
    category,
    game,
    start_date,
    end_date,
    min_selections,
    max_selections,
    base_multiplier,
    multiplier_increment,
    prize_pool,
    entry_fee,
    status,
    rules,
    assets
) VALUES (
    'cs2-ewc-2025',
    'CS2 Esports World Cup 2025',
    'Create parlays for CS2 matches at the Esports World Cup 2025. Select 2 or more match winners and win big with APES tokens!',
    'Esports',
    'CS2',
    '2025-07-01 00:00:00',
    '2025-07-31 23:59:59',
    2,
    10,
    1.8,
    0.5,
    100000,
    10,
    'upcoming',
    '{
        "min_stake": 10,
        "max_stake": 10000,
        "payout_fee": 0.015,
        "burn_fee": 0.025,
        "rules": [
            "Minimum 2 match selections required",
            "All selections must win for parlay to pay out",
            "Odds multiply with each selection",
            "Cancelled matches void that selection only"
        ]
    }',
    '{
        "banner": "https://www.esportsworldcup.com/images/cs2-banner.jpg",
        "logo": "https://www.esportsworldcup.com/images/cs2-logo.png",
        "game_logo": "https://cdn.cloudflare.steamstatic.com/apps/730/header.jpg"
    }'
) ON CONFLICT (tournament_id) DO NOTHING;