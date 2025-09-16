-- Create polymarket orders table
CREATE TABLE IF NOT EXISTS polymarket_orders (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    polymarket_order_id VARCHAR(100) UNIQUE,
    market_id VARCHAR(100) NOT NULL,
    token_id VARCHAR(100) NOT NULL,
    
    -- Order details
    side VARCHAR(10) NOT NULL, -- 'BUY' or 'SELL'
    size DECIMAL(20, 6) NOT NULL,
    price DECIMAL(10, 4) NOT NULL,
    
    -- Fee information
    platform_fee DECIMAL(20, 6) NOT NULL,
    fee_rate DECIMAL(5, 4) NOT NULL,
    apes_balance DECIMAL(20, 6),
    
    -- Status tracking
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, FILLED, CANCELLED, FAILED
    filled_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for polymarket_orders
CREATE INDEX IF NOT EXISTS idx_user_orders ON polymarket_orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_status ON polymarket_orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_market_orders ON polymarket_orders(market_id, created_at DESC);

-- Create platform fees tracking table
CREATE TABLE IF NOT EXISTS platform_fees (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    amount DECIMAL(20, 6) NOT NULL,
    fee_type VARCHAR(50) NOT NULL, -- 'polymarket_order', 'withdrawal', etc.
    
    -- Reference to source
    order_id INTEGER REFERENCES polymarket_orders(id),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for platform_fees
CREATE INDEX IF NOT EXISTS idx_user_fees ON platform_fees(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fee_type ON platform_fees(fee_type, created_at DESC);

-- Create fee distributions table
CREATE TABLE IF NOT EXISTS fee_distributions (
    id SERIAL PRIMARY KEY,
    type VARCHAR(20) NOT NULL, -- 'buyback', 'development', 'liquidity', 'referral'
    amount DECIMAL(20, 6) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed'
    
    -- Transaction details
    transaction_hash VARCHAR(100),
    processed_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for fee_distributions
CREATE INDEX IF NOT EXISTS idx_dist_status ON fee_distributions(status, created_at);
CREATE INDEX IF NOT EXISTS idx_dist_type ON fee_distributions(type, created_at DESC);

-- Create user tier tracking table
CREATE TABLE IF NOT EXISTS user_fee_tiers (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    
    -- APES holdings snapshot
    apes_balance DECIMAL(20, 6) NOT NULL,
    tier_name VARCHAR(20) NOT NULL, -- 'bronze', 'silver', 'gold', 'platinum'
    fee_rate DECIMAL(5, 4) NOT NULL,
    
    -- Benefits
    has_copy_trading BOOLEAN DEFAULT FALSE,
    has_analytics BOOLEAN DEFAULT FALSE,
    has_api_access BOOLEAN DEFAULT FALSE,
    has_priority_support BOOLEAN DEFAULT FALSE,
    
    -- Tracking
    verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP -- For time-locked tiers
);

-- Create indexes for user_fee_tiers
CREATE INDEX IF NOT EXISTS idx_user_tier ON user_fee_tiers(user_id, verified_at DESC);
CREATE INDEX IF NOT EXISTS idx_tier_name ON user_fee_tiers(tier_name);

-- Create copy trading table
CREATE TABLE IF NOT EXISTS copy_trading_subscriptions (
    id SERIAL PRIMARY KEY,
    follower_id VARCHAR(100) NOT NULL,
    leader_id VARCHAR(100) NOT NULL,
    
    -- Settings
    max_bet_size DECIMAL(20, 6),
    copy_percentage DECIMAL(5, 2) DEFAULT 100.00, -- % of leader's bet to copy
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Stats
    total_copied_bets INTEGER DEFAULT 0,
    total_profit_loss DECIMAL(20, 6) DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deactivated_at TIMESTAMP,
    
    -- Constraints
    UNIQUE(follower_id, leader_id),
    CHECK (copy_percentage > 0 AND copy_percentage <= 100)
);

-- Create indexes for copy_trading_subscriptions
CREATE INDEX IF NOT EXISTS idx_follower_subs ON copy_trading_subscriptions(follower_id, is_active);
CREATE INDEX IF NOT EXISTS idx_leader_followers ON copy_trading_subscriptions(leader_id, is_active);

-- Create leaderboard stats table
CREATE TABLE IF NOT EXISTS polymarket_leaderboard (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    period VARCHAR(20) NOT NULL, -- 'daily', 'weekly', 'monthly', 'all_time'
    
    -- Performance metrics
    total_volume DECIMAL(20, 6) DEFAULT 0,
    total_trades INTEGER DEFAULT 0,
    winning_trades INTEGER DEFAULT 0,
    profit_loss DECIMAL(20, 6) DEFAULT 0,
    roi_percentage DECIMAL(10, 2) DEFAULT 0,
    
    -- Rankings
    volume_rank INTEGER,
    profit_rank INTEGER,
    roi_rank INTEGER,
    
    -- Metadata
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE(user_id, period, calculated_at)
);

-- Create indexes for polymarket_leaderboard
CREATE INDEX IF NOT EXISTS idx_leaderboard_period ON polymarket_leaderboard(period, calculated_at DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_rankings ON polymarket_leaderboard(period, volume_rank, profit_rank);

-- Create referral tracking table
CREATE TABLE IF NOT EXISTS polymarket_referrals (
    id SERIAL PRIMARY KEY,
    referrer_id VARCHAR(100) NOT NULL,
    referee_id VARCHAR(100) NOT NULL,
    referral_code VARCHAR(20) UNIQUE NOT NULL,
    
    -- Rewards tracking
    total_fees_generated DECIMAL(20, 6) DEFAULT 0,
    total_rewards_earned DECIMAL(20, 6) DEFAULT 0,
    reward_percentage DECIMAL(5, 2) DEFAULT 20.00, -- 20% of referee's fees
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    first_bet_at TIMESTAMP,
    
    -- Constraints
    UNIQUE(referee_id) -- One referrer per user
);

-- Create indexes for polymarket_referrals
CREATE INDEX IF NOT EXISTS idx_referrer ON polymarket_referrals(referrer_id, is_active);
CREATE INDEX IF NOT EXISTS idx_referral_code ON polymarket_referrals(referral_code);

-- Create API access tokens table
CREATE TABLE IF NOT EXISTS api_access_tokens (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    token_hash VARCHAR(64) UNIQUE NOT NULL, -- SHA256 of actual token
    
    -- Permissions
    can_read BOOLEAN DEFAULT TRUE,
    can_trade BOOLEAN DEFAULT FALSE,
    rate_limit INTEGER DEFAULT 100, -- requests per minute
    
    -- Usage tracking
    last_used_at TIMESTAMP,
    total_requests INTEGER DEFAULT 0,
    
    -- Lifecycle
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    revoked_at TIMESTAMP
);

-- Create indexes for api_access_tokens
CREATE INDEX IF NOT EXISTS idx_token_lookup ON api_access_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_user_tokens ON api_access_tokens(user_id, revoked_at);

-- Create user settings table
CREATE TABLE IF NOT EXISTS user_proxy_settings (
    user_id VARCHAR(100) PRIMARY KEY,
    
    -- Notification preferences
    notify_on_fill BOOLEAN DEFAULT TRUE,
    notify_on_cancel BOOLEAN DEFAULT TRUE,
    notify_on_market_resolve BOOLEAN DEFAULT TRUE,
    telegram_chat_id VARCHAR(100),
    
    -- Trading preferences
    default_bet_size DECIMAL(20, 6),
    max_daily_loss DECIMAL(20, 6),
    auto_cancel_after_hours INTEGER DEFAULT 24,
    
    -- Display preferences
    hide_from_leaderboard BOOLEAN DEFAULT FALSE,
    share_positions BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create proxy wallets table (if not exists)
CREATE TABLE IF NOT EXISTS proxy_wallets (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(100) UNIQUE,
    address VARCHAR(42) NOT NULL,
    encrypted_private_key TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used TIMESTAMP
);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_polymarket_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Only create triggers if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_polymarket_orders_updated_at') THEN
        CREATE TRIGGER update_polymarket_orders_updated_at 
            BEFORE UPDATE ON polymarket_orders
            FOR EACH ROW EXECUTE FUNCTION update_polymarket_updated_at();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_proxy_settings_updated_at') THEN
        CREATE TRIGGER update_user_proxy_settings_updated_at 
            BEFORE UPDATE ON user_proxy_settings
            FOR EACH ROW EXECUTE FUNCTION update_polymarket_updated_at();
    END IF;
END$$;

-- Sample data for testing
INSERT INTO user_fee_tiers (user_id, apes_balance, tier_name, fee_rate, has_copy_trading, has_analytics, has_api_access)
VALUES 
    ('test_user_bronze', 1500, 'bronze', 0.0075, false, false, false),
    ('test_user_silver', 25000, 'silver', 0.005, true, false, false),
    ('test_user_gold', 75000, 'gold', 0.003, true, true, false),
    ('test_user_platinum', 150000, 'platinum', 0.002, true, true, true)
ON CONFLICT (user_id) DO NOTHING;