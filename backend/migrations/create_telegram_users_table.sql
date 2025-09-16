-- Create telegram users table
CREATE TABLE IF NOT EXISTS telegram_users (
    id SERIAL PRIMARY KEY,
    user_id BIGINT UNIQUE NOT NULL, -- Telegram user ID
    chat_id BIGINT NOT NULL, -- Telegram chat ID
    username VARCHAR(100), -- Telegram username (optional)
    wallet_address VARCHAR(100), -- Connected Solana wallet
    
    -- User preferences
    notifications_enabled BOOLEAN DEFAULT TRUE,
    preferred_language VARCHAR(10) DEFAULT 'en',
    
    -- Stats tracking
    total_bets INTEGER DEFAULT 0,
    total_volume DECIMAL(20, 6) DEFAULT 0,
    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_telegram_user_id ON telegram_users(user_id);
CREATE INDEX IF NOT EXISTS idx_telegram_wallet ON telegram_users(wallet_address);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_telegram_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Only create trigger if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_telegram_users_updated_at') THEN
        CREATE TRIGGER update_telegram_users_updated_at 
            BEFORE UPDATE ON telegram_users
            FOR EACH ROW EXECUTE FUNCTION update_telegram_users_updated_at();
    END IF;
END$$;