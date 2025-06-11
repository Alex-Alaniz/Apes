-- Create table for storing @PrimapeApp tweets
-- This allows us to serve tweets from database instead of hitting X API rate limits

CREATE TABLE IF NOT EXISTS primape_tweets (
    id SERIAL PRIMARY KEY,
    tweet_id VARCHAR(255) UNIQUE NOT NULL,
    content TEXT NOT NULL,
    posted_at TIMESTAMP WITH TIME ZONE NOT NULL,
    like_count INTEGER DEFAULT 0,
    retweet_count INTEGER DEFAULT 0,
    reply_count INTEGER DEFAULT 0,
    fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_primape_tweets_posted_at ON primape_tweets(posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_primape_tweets_tweet_id ON primape_tweets(tweet_id);
CREATE INDEX IF NOT EXISTS idx_primape_tweets_fetched_at ON primape_tweets(fetched_at DESC);

-- Add some sample tweets to start with (in case X API is not immediately available)
INSERT INTO primape_tweets (
    tweet_id, 
    content, 
    posted_at, 
    like_count, 
    retweet_count, 
    reply_count,
    fetched_at
) VALUES 
(
    '1867901234567890123',
    '🔥 FIFA Club World Cup 2025 Tournament is LIVE!

💰 25,000 APES Prize Pool
🏆 Join now and earn instant rewards
⚡ Early bird bonus still available!

Connect your wallet and start predicting!

🚀 apes.primape.app/tournaments

#PredictionMarkets #FIFA #ClubWorldCup #Web3',
    NOW() - INTERVAL '2 hours',
    45,
    12,
    8,
    NOW()
),
(
    '1867801234567890124',
    'GM Apes! 🦍

Ready to make some epic predictions today?

✨ New markets added daily
💎 Earn APES points for every prediction
🎯 Tournament leaderboards heating up
🏆 25K prize pool waiting

What''s your play today? 👀

#GM #PredictionMarkets #Solana',
    NOW() - INTERVAL '6 hours',
    23,
    6,
    4,
    NOW()
),
(
    '1867701234567890125',
    '🎉 Community Milestone Alert! 🎉

✅ 1,000+ Active Predictors
✅ 500+ Markets Created
✅ 100,000+ Predictions Made
✅ 50,000+ APES Distributed

Thanks to our amazing community! The future of prediction markets is bright 🚀

#Community #Milestones #Web3',
    NOW() - INTERVAL '12 hours',
    67,
    18,
    12,
    NOW()
) ON CONFLICT (tweet_id) DO NOTHING;

-- Add a comment explaining the table purpose
COMMENT ON TABLE primape_tweets IS 'Stores @PrimapeApp tweets to reduce X API rate limit usage. Updated periodically via scheduled tasks.'; 