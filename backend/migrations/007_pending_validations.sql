-- Migration for pending Twitter validations
-- This table stores validation requests that are processed asynchronously

CREATE TABLE IF NOT EXISTS pending_twitter_validations (
    id SERIAL PRIMARY KEY,
    user_address VARCHAR(44) NOT NULL REFERENCES users(wallet_address),
    tweet_id VARCHAR(50) NOT NULL,
    engagement_type VARCHAR(20) NOT NULL, -- 'like', 'repost', 'comment'
    tweet_url TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'validated', 'failed', 'error'
    points_awarded INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    validated_at TIMESTAMP,
    UNIQUE(user_address, tweet_id, engagement_type)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pending_validations_user ON pending_twitter_validations(user_address);
CREATE INDEX IF NOT EXISTS idx_pending_validations_status ON pending_twitter_validations(status);
CREATE INDEX IF NOT EXISTS idx_pending_validations_created ON pending_twitter_validations(created_at DESC);

-- Add cleanup function to remove old validations (optional)
-- This can be run periodically to keep the table size manageable
CREATE OR REPLACE FUNCTION cleanup_old_validations() RETURNS void AS $$
BEGIN
    DELETE FROM pending_twitter_validations 
    WHERE created_at < NOW() - INTERVAL '7 days' 
    AND status IN ('validated', 'failed', 'error');
END;
$$ LANGUAGE plpgsql; 