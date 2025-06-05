-- Prediction Market Database Schema

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    wallet_address VARCHAR(44) PRIMARY KEY,
    username VARCHAR(20) UNIQUE,
    avatar_url TEXT,
    bio TEXT,
    twitter_handle VARCHAR(50),
    discord_handle VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create user_stats table for performance tracking
CREATE TABLE IF NOT EXISTS user_stats (
    wallet_address VARCHAR(44) PRIMARY KEY REFERENCES users(wallet_address),
    total_predictions INTEGER DEFAULT 0,
    winning_predictions INTEGER DEFAULT 0,
    total_invested DECIMAL(20, 6) DEFAULT 0,
    total_claimed DECIMAL(20, 6) DEFAULT 0,
    total_profit DECIMAL(20, 6) DEFAULT 0,
    win_rate DECIMAL(5, 2) DEFAULT 0,
    rank VARCHAR(20) DEFAULT 'Novice',
    reputation_score INTEGER DEFAULT 0,
    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create predictions history table
CREATE TABLE IF NOT EXISTS prediction_history (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(44) REFERENCES users(wallet_address),
    market_pubkey VARCHAR(44) NOT NULL,
    market_question TEXT NOT NULL,
    option_index INTEGER NOT NULL,
    option_text TEXT NOT NULL,
    amount DECIMAL(20, 6) NOT NULL,
    predicted_at TIMESTAMP NOT NULL,
    market_resolved_at TIMESTAMP,
    is_winner BOOLEAN,
    payout_amount DECIMAL(20, 6),
    claimed BOOLEAN DEFAULT FALSE,
    claimed_at TIMESTAMP,
    transaction_signature VARCHAR(88),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create markets cache table for faster queries
CREATE TABLE IF NOT EXISTS markets_cache (
    market_pubkey VARCHAR(44) PRIMARY KEY,
    creator_wallet VARCHAR(44),
    question TEXT NOT NULL,
    category VARCHAR(50),
    options JSONB NOT NULL,
    option_pools JSONB NOT NULL,
    total_volume DECIMAL(20, 6) DEFAULT 0,
    resolution_date TIMESTAMP,
    status VARCHAR(20),
    winning_option INTEGER,
    participant_count INTEGER DEFAULT 0,
    created_at TIMESTAMP,
    resolved_at TIMESTAMP,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create user_follows table for social features
CREATE TABLE IF NOT EXISTS user_follows (
    follower_wallet VARCHAR(44) REFERENCES users(wallet_address),
    following_wallet VARCHAR(44) REFERENCES users(wallet_address),
    followed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (follower_wallet, following_wallet)
);

-- Create market_comments table
CREATE TABLE IF NOT EXISTS market_comments (
    id SERIAL PRIMARY KEY,
    market_pubkey VARCHAR(44) NOT NULL,
    wallet_address VARCHAR(44) REFERENCES users(wallet_address),
    parent_comment_id INTEGER REFERENCES market_comments(id),
    content TEXT NOT NULL,
    likes INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create comment_likes table
CREATE TABLE IF NOT EXISTS comment_likes (
    comment_id INTEGER REFERENCES market_comments(id),
    wallet_address VARCHAR(44) REFERENCES users(wallet_address),
    liked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (comment_id, wallet_address)
);

-- Create leaderboard view
CREATE OR REPLACE VIEW leaderboard AS
SELECT 
    u.wallet_address,
    u.username,
    u.avatar_url,
    us.total_predictions,
    us.winning_predictions,
    us.total_invested,
    us.total_claimed,
    us.total_profit,
    us.win_rate,
    us.rank,
    us.reputation_score,
    RANK() OVER (ORDER BY us.total_profit DESC) as profit_rank,
    RANK() OVER (ORDER BY us.win_rate DESC, us.total_predictions DESC) as accuracy_rank,
    RANK() OVER (ORDER BY us.total_invested DESC) as volume_rank
FROM users u
JOIN user_stats us ON u.wallet_address = us.wallet_address
WHERE us.total_predictions >= 5; -- Minimum 5 predictions to appear on leaderboard

-- Create indexes for performance
CREATE INDEX idx_prediction_history_wallet ON prediction_history(wallet_address);
CREATE INDEX idx_prediction_history_market ON prediction_history(market_pubkey);
CREATE INDEX idx_markets_cache_status ON markets_cache(status);
CREATE INDEX idx_markets_cache_creator ON markets_cache(creator_wallet);
CREATE INDEX idx_user_stats_profit ON user_stats(total_profit DESC);
CREATE INDEX idx_user_stats_win_rate ON user_stats(win_rate DESC);
CREATE INDEX idx_market_comments_market ON market_comments(market_pubkey);

-- Create update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_stats_updated_at BEFORE UPDATE ON user_stats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_market_comments_updated_at BEFORE UPDATE ON market_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 