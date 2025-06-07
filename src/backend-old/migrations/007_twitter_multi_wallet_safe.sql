-- Safe Migration to support multiple wallets per Twitter account
-- This version checks for existing structures and handles them gracefully

-- First, drop existing structures if they exist from failed migration
DROP VIEW IF EXISTS twitter_wallet_stats;
DROP TABLE IF EXISTS wallet_twitter_links;
DROP TABLE IF EXISTS twitter_accounts CASCADE;

-- Create new table to store Twitter accounts independently
CREATE TABLE IF NOT EXISTS twitter_accounts (
    twitter_id VARCHAR(50) PRIMARY KEY,
    twitter_username VARCHAR(50),
    twitter_followers INTEGER DEFAULT 0,
    first_linked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create junction table for wallet-twitter relationships
CREATE TABLE IF NOT EXISTS wallet_twitter_links (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(44) REFERENCES users(wallet_address),
    twitter_id VARCHAR(50) REFERENCES twitter_accounts(twitter_id),
    linked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_primary_wallet BOOLEAN DEFAULT FALSE,
    UNIQUE(wallet_address, twitter_id)
);

-- Migrate existing data to new structure
INSERT INTO twitter_accounts (twitter_id, twitter_username, twitter_followers, first_linked_at)
SELECT DISTINCT twitter_id, twitter_username, twitter_followers, twitter_linked_at
FROM users
WHERE twitter_id IS NOT NULL
ON CONFLICT (twitter_id) DO NOTHING;

-- Populate junction table
INSERT INTO wallet_twitter_links (wallet_address, twitter_id, linked_at, is_primary_wallet)
SELECT wallet_address, twitter_id, twitter_linked_at, TRUE
FROM users
WHERE twitter_id IS NOT NULL
ON CONFLICT (wallet_address, twitter_id) DO NOTHING;

-- Drop the unique constraint on twitter_id in users table
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_twitter_id_key;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_wallet_twitter_links_twitter ON wallet_twitter_links(twitter_id);
CREATE INDEX IF NOT EXISTS idx_wallet_twitter_links_wallet ON wallet_twitter_links(wallet_address);

-- Handle twitter_oauth_tokens migration
-- First check if twitter_id column exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'twitter_oauth_tokens' 
                   AND column_name = 'twitter_id') THEN
        ALTER TABLE twitter_oauth_tokens ADD COLUMN twitter_id VARCHAR(50);
    END IF;
END $$;

-- Migrate oauth tokens data - only for tokens that have corresponding users with twitter_id
UPDATE twitter_oauth_tokens tot
SET twitter_id = u.twitter_id
FROM users u
WHERE tot.user_address = u.wallet_address
AND u.twitter_id IS NOT NULL
AND tot.twitter_id IS NULL;

-- Remove tokens without twitter_id
DELETE FROM twitter_oauth_tokens WHERE twitter_id IS NULL;

-- Only proceed with constraints if we have data
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM twitter_oauth_tokens LIMIT 1) THEN
        -- Add foreign key constraint
        ALTER TABLE twitter_oauth_tokens 
          ADD CONSTRAINT fk_twitter_oauth_twitter_id 
          FOREIGN KEY (twitter_id) REFERENCES twitter_accounts(twitter_id);
        
        -- Drop old primary key and create new one
        ALTER TABLE twitter_oauth_tokens DROP CONSTRAINT IF EXISTS twitter_oauth_tokens_pkey;
        ALTER TABLE twitter_oauth_tokens ADD PRIMARY KEY (twitter_id);
    END IF;
END $$;

-- Safely remove user_address column if it exists
ALTER TABLE twitter_oauth_tokens DROP COLUMN IF EXISTS user_address;

-- Handle twitter_engagements migration
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'twitter_engagements' 
                   AND column_name = 'twitter_id') THEN
        ALTER TABLE twitter_engagements ADD COLUMN twitter_id VARCHAR(50);
    END IF;
END $$;

-- Migrate engagement data
UPDATE twitter_engagements te
SET twitter_id = u.twitter_id
FROM users u
WHERE te.user_address = u.wallet_address
AND u.twitter_id IS NOT NULL
AND te.twitter_id IS NULL;

-- Update constraint to prevent duplicate engagements per Twitter account
ALTER TABLE twitter_engagements DROP CONSTRAINT IF EXISTS twitter_engagements_user_address_tweet_id_engagement_type_key;
ALTER TABLE twitter_engagements DROP CONSTRAINT IF EXISTS twitter_engagements_unique;
ALTER TABLE twitter_engagements ADD CONSTRAINT twitter_engagements_unique 
  UNIQUE(twitter_id, tweet_id, engagement_type);

-- Create view for aggregated stats across all linked wallets
CREATE OR REPLACE VIEW twitter_wallet_stats AS
SELECT 
    ta.twitter_id,
    ta.twitter_username,
    COUNT(DISTINCT wtl.wallet_address) as linked_wallets_count,
    STRING_AGG(wtl.wallet_address, ',') as linked_wallets,
    COALESCE(SUM(pb.total_points), 0) as total_points_all_wallets,
    COALESCE(SUM(pb.available_points), 0) as available_points_all_wallets,
    COALESCE(MAX(us.total_predictions), 0) as max_predictions,
    COALESCE(SUM(us.total_invested), 0) as total_invested_all_wallets,
    COALESCE(SUM(us.total_profit), 0) as total_profit_all_wallets
FROM twitter_accounts ta
JOIN wallet_twitter_links wtl ON ta.twitter_id = wtl.twitter_id
LEFT JOIN point_balances pb ON wtl.wallet_address = pb.user_address
LEFT JOIN user_stats us ON wtl.wallet_address = us.wallet_address
GROUP BY ta.twitter_id, ta.twitter_username;

-- Add comment to explain the new architecture
COMMENT ON TABLE wallet_twitter_links IS 'Maps Twitter accounts to multiple wallet addresses. Each Twitter account can have multiple wallets, but each wallet can only link to one Twitter account.'; 