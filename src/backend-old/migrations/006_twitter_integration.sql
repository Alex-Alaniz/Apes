-- Add Twitter fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS twitter_id VARCHAR(50) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS twitter_username VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS twitter_linked_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS twitter_followers INTEGER DEFAULT 0;

-- Twitter engagement tracking
CREATE TABLE IF NOT EXISTS twitter_engagements (
    id SERIAL PRIMARY KEY,
    user_address VARCHAR(44) REFERENCES users(wallet_address),
    tweet_id VARCHAR(50) NOT NULL,
    engagement_type VARCHAR(20), -- 'like', 'repost', 'comment', 'follow'
    points_awarded INTEGER,
    verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_address, tweet_id, engagement_type)
);

-- PrimapeApp posts cache
CREATE TABLE IF NOT EXISTS primape_tweets (
    tweet_id VARCHAR(50) PRIMARY KEY,
    content TEXT,
    media_urls JSONB,
    created_at TIMESTAMP,
    engagement_stats JSONB,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Twitter OAuth tokens (encrypted)
CREATE TABLE IF NOT EXISTS twitter_oauth_tokens (
    user_address VARCHAR(44) PRIMARY KEY REFERENCES users(wallet_address),
    access_token TEXT NOT NULL, -- Should be encrypted
    refresh_token TEXT NOT NULL, -- Should be encrypted
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Update engagement activities to include Twitter requirements
ALTER TABLE engagement_points ADD COLUMN IF NOT EXISTS requires_twitter BOOLEAN DEFAULT FALSE;
ALTER TABLE engagement_points ADD COLUMN IF NOT EXISTS tweet_id VARCHAR(50);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_twitter_engagements_user ON twitter_engagements(user_address);
CREATE INDEX IF NOT EXISTS idx_twitter_engagements_tweet ON twitter_engagements(tweet_id);
CREATE INDEX IF NOT EXISTS idx_primape_tweets_created ON primape_tweets(created_at DESC);

-- Add Twitter-specific point activities
INSERT INTO engagement_points (user_address, activity_type, points_earned, metadata, requires_twitter)
SELECT wallet_address, 'TWITTER_LINK_BONUS', 100, '{"one_time": true}'::jsonb, true
FROM users
WHERE twitter_id IS NOT NULL
ON CONFLICT DO NOTHING; 