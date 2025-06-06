-- ==================================================
-- APES Prediction Market - Production Database Fixes
-- ==================================================

-- 1. Add missing columns to engagement_points table
ALTER TABLE engagement_points 
ADD COLUMN IF NOT EXISTS requires_twitter BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS tweet_id VARCHAR(100);

-- 2. Create the function for updating point balances
CREATE OR REPLACE FUNCTION update_point_balance()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO point_balances (user_address, total_points, available_points)
    VALUES (NEW.user_address, NEW.points_earned, NEW.points_earned)
    ON CONFLICT (user_address) DO UPDATE
    SET 
        total_points = point_balances.total_points + NEW.points_earned,
        available_points = point_balances.available_points + NEW.points_earned,
        updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create the trigger to automatically update point balances
DROP TRIGGER IF EXISTS update_balance_on_engagement ON engagement_points;
CREATE TRIGGER update_balance_on_engagement
AFTER INSERT ON engagement_points
FOR EACH ROW
EXECUTE FUNCTION update_point_balance();

-- 4. Backfill point balances for existing users (manual execution needed)
-- This query will show what needs to be updated:
SELECT 
    user_address,
    SUM(points_earned) as total_points
FROM engagement_points 
GROUP BY user_address
ORDER BY total_points DESC;

-- 5. Create twitter-related tables if they don't exist
CREATE TABLE IF NOT EXISTS twitter_accounts (
    twitter_id VARCHAR(50) PRIMARY KEY,
    twitter_username VARCHAR(100) NOT NULL,
    twitter_followers INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS wallet_twitter_links (
    wallet_address VARCHAR(44) REFERENCES users(wallet_address),
    twitter_id VARCHAR(50) REFERENCES twitter_accounts(twitter_id),
    is_primary_wallet BOOLEAN DEFAULT FALSE,
    linked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (wallet_address, twitter_id)
);

CREATE TABLE IF NOT EXISTS twitter_engagements (
    id SERIAL PRIMARY KEY,
    user_address VARCHAR(44) REFERENCES users(wallet_address),
    tweet_id VARCHAR(100) NOT NULL,
    engagement_type VARCHAR(20) NOT NULL, -- 'like', 'repost', 'comment'
    points_awarded INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Update users table to include twitter fields if missing
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS twitter_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS twitter_username VARCHAR(100),
ADD COLUMN IF NOT EXISTS twitter_followers INTEGER DEFAULT 0;

-- 7. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_engagement_requires_twitter ON engagement_points(requires_twitter);
CREATE INDEX IF NOT EXISTS idx_engagement_tweet_id ON engagement_points(tweet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_twitter_links_wallet ON wallet_twitter_links(wallet_address);
CREATE INDEX IF NOT EXISTS idx_wallet_twitter_links_twitter ON wallet_twitter_links(twitter_id);
CREATE INDEX IF NOT EXISTS idx_twitter_engagements_user ON twitter_engagements(user_address);
CREATE INDEX IF NOT EXISTS idx_twitter_engagements_tweet ON twitter_engagements(tweet_id);

-- ==================================================
-- MANUAL BACKFILL QUERY (run after creating trigger)
-- ==================================================

-- Insert missing point balances based on engagement_points
INSERT INTO point_balances (user_address, total_points, available_points, claimed_points, updated_at)
SELECT 
    user_address,
    SUM(points_earned) as total_points,
    SUM(points_earned) as available_points,
    0 as claimed_points,
    CURRENT_TIMESTAMP as updated_at
FROM engagement_points 
GROUP BY user_address
ON CONFLICT (user_address) DO UPDATE
SET 
    total_points = EXCLUDED.total_points,
    available_points = EXCLUDED.available_points,
    updated_at = CURRENT_TIMESTAMP;

-- ==================================================
-- VERIFICATION QUERIES
-- ==================================================

-- Check if trigger exists
SELECT trigger_name, event_manipulation, action_statement 
FROM information_schema.triggers 
WHERE trigger_name = 'update_balance_on_engagement';

-- Check point balances
SELECT COUNT(*) as users_with_points FROM point_balances WHERE total_points > 0;

-- Check engagement points
SELECT COUNT(*) as total_engagement_entries FROM engagement_points;

-- Check for users with engagement but no balance
SELECT DISTINCT ep.user_address 
FROM engagement_points ep 
LEFT JOIN point_balances pb ON ep.user_address = pb.user_address 
WHERE pb.user_address IS NULL; 