-- Migration to support multiple wallets per Twitter account
-- This changes the architecture from 1:1 to 1:many relationship

-- First, create a new table to store Twitter accounts independently
CREATE TABLE IF NOT EXISTS twitter_accounts (
    twitter_id VARCHAR(50) PRIMARY KEY,
    twitter_username VARCHAR(50),
    twitter_followers INTEGER DEFAULT 0,
    first_linked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create a junction table for wallet-twitter relationships
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
WHERE twitter_id IS NOT NULL;

-- Populate junction table
INSERT INTO wallet_twitter_links (wallet_address, twitter_id, linked_at, is_primary_wallet)
SELECT wallet_address, twitter_id, twitter_linked_at, TRUE
FROM users
WHERE twitter_id IS NOT NULL;

-- Drop the unique constraint on twitter_id in users table
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_twitter_id_key;

-- Create indexes for performance
CREATE INDEX idx_wallet_twitter_links_twitter ON wallet_twitter_links(twitter_id);
CREATE INDEX idx_wallet_twitter_links_wallet ON wallet_twitter_links(wallet_address);

-- Update twitter_oauth_tokens to reference twitter_id instead of wallet
ALTER TABLE twitter_oauth_tokens ADD COLUMN twitter_id VARCHAR(50);

-- Migrate oauth tokens data
UPDATE twitter_oauth_tokens tot
SET twitter_id = u.twitter_id
FROM users u
WHERE tot.user_address = u.wallet_address;

-- Make twitter_id required and add foreign key
ALTER TABLE twitter_oauth_tokens 
  ALTER COLUMN twitter_id SET NOT NULL,
  ADD CONSTRAINT fk_twitter_oauth_twitter_id 
    FOREIGN KEY (twitter_id) REFERENCES twitter_accounts(twitter_id);

-- Drop old primary key and create new one
ALTER TABLE twitter_oauth_tokens DROP CONSTRAINT twitter_oauth_tokens_pkey;
ALTER TABLE twitter_oauth_tokens ADD PRIMARY KEY (twitter_id);
ALTER TABLE twitter_oauth_tokens DROP COLUMN user_address;

-- Update twitter_engagements to track by twitter_id
ALTER TABLE twitter_engagements ADD COLUMN twitter_id VARCHAR(50);

-- Migrate engagement data
UPDATE twitter_engagements te
SET twitter_id = u.twitter_id
FROM users u
WHERE te.user_address = u.wallet_address;

-- Update constraint to prevent duplicate engagements per Twitter account
ALTER TABLE twitter_engagements DROP CONSTRAINT IF EXISTS twitter_engagements_user_address_tweet_id_engagement_type_key;
ALTER TABLE twitter_engagements ADD CONSTRAINT twitter_engagements_unique 
  UNIQUE(twitter_id, tweet_id, engagement_type);

-- Create view for aggregated stats across all linked wallets
CREATE OR REPLACE VIEW twitter_wallet_stats AS
SELECT 
    ta.twitter_id,
    ta.twitter_username,
    COUNT(DISTINCT wtl.wallet_address) as linked_wallets_count,
    STRING_AGG(wtl.wallet_address, ',') as linked_wallets,
    SUM(pb.total_points) as total_points_all_wallets,
    SUM(pb.available_points) as available_points_all_wallets,
    MAX(us.total_predictions) as max_predictions,
    SUM(us.total_invested) as total_invested_all_wallets,
    SUM(us.total_profit) as total_profit_all_wallets
FROM twitter_accounts ta
JOIN wallet_twitter_links wtl ON ta.twitter_id = wtl.twitter_id
LEFT JOIN point_balances pb ON wtl.wallet_address = pb.user_address
LEFT JOIN user_stats us ON wtl.wallet_address = us.wallet_address
GROUP BY ta.twitter_id, ta.twitter_username;

-- Add comment to explain the new architecture
COMMENT ON TABLE wallet_twitter_links IS 'Maps Twitter accounts to multiple wallet addresses. Each Twitter account can have multiple wallets, but each wallet can only link to one Twitter account.'; 