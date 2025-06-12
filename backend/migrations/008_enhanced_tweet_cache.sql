-- Enhanced tweet cache migration
-- Add fields needed for scheduled caching system

-- First, check if we need to add the missing columns
ALTER TABLE primape_tweets ADD COLUMN IF NOT EXISTS media_urls JSONB;
ALTER TABLE primape_tweets ADD COLUMN IF NOT EXISTS engagement_stats JSONB;
ALTER TABLE primape_tweets ADD COLUMN IF NOT EXISTS profile_image_url TEXT;
ALTER TABLE primape_tweets ADD COLUMN IF NOT EXISTS author_verified BOOLEAN DEFAULT false;

-- Use updated_at as our last_updated equivalent (rename if needed)
-- ALTER TABLE primape_tweets RENAME COLUMN updated_at TO last_updated;

-- Ensure we have proper indexing for cache queries (use existing updated_at column)
CREATE INDEX IF NOT EXISTS idx_primape_tweets_updated_at ON primape_tweets(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_primape_tweets_created_at ON primape_tweets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_primape_tweets_posted_at ON primape_tweets(posted_at DESC);

-- Add a cache status tracking table
CREATE TABLE IF NOT EXISTS tweet_cache_status (
    id SERIAL PRIMARY KEY,
    last_fetch_attempt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_successful_fetch TIMESTAMP,
    tweets_fetched INTEGER DEFAULT 0,
    api_rate_limited BOOLEAN DEFAULT false,
    error_message TEXT,
    next_scheduled_fetch TIMESTAMP
);

-- Insert initial status record
INSERT INTO tweet_cache_status (last_fetch_attempt, tweets_fetched) 
VALUES (NOW(), 0) 
ON CONFLICT DO NOTHING;

-- Create function to update cache status
CREATE OR REPLACE FUNCTION update_cache_status(
    p_tweets_fetched INTEGER,
    p_api_rate_limited BOOLEAN DEFAULT false,
    p_error_message TEXT DEFAULT NULL
) RETURNS void AS $$
BEGIN
    UPDATE tweet_cache_status 
    SET 
        last_fetch_attempt = NOW(),
        last_successful_fetch = CASE WHEN p_tweets_fetched > 0 THEN NOW() ELSE last_successful_fetch END,
        tweets_fetched = p_tweets_fetched,
        api_rate_limited = p_api_rate_limited,
        error_message = p_error_message,
        next_scheduled_fetch = NOW() + INTERVAL '2 hours'
    WHERE id = (SELECT MIN(id) FROM tweet_cache_status);
    
    -- If no record exists, create one
    IF NOT FOUND THEN
        INSERT INTO tweet_cache_status (
            last_fetch_attempt, 
            last_successful_fetch,
            tweets_fetched, 
            api_rate_limited, 
            error_message,
            next_scheduled_fetch
        ) VALUES (
            NOW(), 
            CASE WHEN p_tweets_fetched > 0 THEN NOW() ELSE NULL END,
            p_tweets_fetched, 
            p_api_rate_limited, 
            p_error_message,
            NOW() + INTERVAL '2 hours'
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create view for tweet cache analytics (using existing columns)
CREATE OR REPLACE VIEW tweet_cache_analytics AS
SELECT 
    COUNT(*) as total_cached_tweets,
    MAX(updated_at) as most_recent_cache,
    MIN(updated_at) as oldest_cache,
    COUNT(CASE WHEN updated_at > NOW() - INTERVAL '3 hours' THEN 1 END) as recent_tweets,
    COUNT(CASE WHEN updated_at < NOW() - INTERVAL '24 hours' THEN 1 END) as old_tweets,
    AVG(EXTRACT(EPOCH FROM (NOW() - created_at))/3600) as avg_tweet_age_hours
FROM primape_tweets;

-- Update engagement_stats for existing tweets that only have individual count columns
UPDATE primape_tweets 
SET engagement_stats = jsonb_build_object(
    'like_count', COALESCE(like_count, 0),
    'retweet_count', COALESCE(retweet_count, 0), 
    'reply_count', COALESCE(reply_count, 0)
)
WHERE engagement_stats IS NULL; 