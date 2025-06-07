const db = require('./config/database');

async function ensureTwitterTables() {
  console.log('🔧 Ensuring Twitter integration tables exist...');

  try {
    // 1. Ensure users table has Twitter fields
    await db.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS twitter_id VARCHAR(50),
      ADD COLUMN IF NOT EXISTS twitter_username VARCHAR(100),
      ADD COLUMN IF NOT EXISTS twitter_followers INTEGER DEFAULT 0
    `);
    console.log('✅ Updated users table with Twitter fields');

    // 2. Create twitter_accounts table
    await db.query(`
      CREATE TABLE IF NOT EXISTS twitter_accounts (
        twitter_id VARCHAR(50) PRIMARY KEY,
        twitter_username VARCHAR(100) NOT NULL,
        twitter_followers INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created twitter_accounts table');

    // 3. Create wallet_twitter_links table  
    await db.query(`
      CREATE TABLE IF NOT EXISTS wallet_twitter_links (
        wallet_address VARCHAR(44) REFERENCES users(wallet_address),
        twitter_id VARCHAR(50) REFERENCES twitter_accounts(twitter_id),
        is_primary_wallet BOOLEAN DEFAULT FALSE,
        linked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (wallet_address, twitter_id)
      )
    `);
    console.log('✅ Created wallet_twitter_links table');

    // 4. Create twitter_oauth_tokens table
    await db.query(`
      CREATE TABLE IF NOT EXISTS twitter_oauth_tokens (
        twitter_id VARCHAR(50) PRIMARY KEY REFERENCES twitter_accounts(twitter_id),
        access_token TEXT NOT NULL,
        refresh_token TEXT NOT NULL,
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created twitter_oauth_tokens table');

    // 5. Create twitter_engagements table
    await db.query(`
      CREATE TABLE IF NOT EXISTS twitter_engagements (
        id SERIAL PRIMARY KEY,
        user_address VARCHAR(44) REFERENCES users(wallet_address),
        twitter_id VARCHAR(50) REFERENCES twitter_accounts(twitter_id),
        tweet_id VARCHAR(100) NOT NULL,
        engagement_type VARCHAR(20) NOT NULL,
        points_awarded INTEGER NOT NULL,
        verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(twitter_id, tweet_id, engagement_type)
      )
    `);
    console.log('✅ Created twitter_engagements table');

    // 6. Create primape_tweets table (cache for @PrimapeApp tweets)
    await db.query(`
      CREATE TABLE IF NOT EXISTS primape_tweets (
        tweet_id VARCHAR(100) PRIMARY KEY,
        content TEXT,
        media_urls JSONB,
        created_at TIMESTAMP,
        engagement_stats JSONB,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created primape_tweets table');

    // 7. Ensure engagement_points table has Twitter columns
    await db.query(`
      ALTER TABLE engagement_points 
      ADD COLUMN IF NOT EXISTS requires_twitter BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS tweet_id VARCHAR(100)
    `);
    console.log('✅ Updated engagement_points table with Twitter fields');

    // 8. Create indexes for performance
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_twitter_engagements_user ON twitter_engagements(user_address);
      CREATE INDEX IF NOT EXISTS idx_twitter_engagements_twitter ON twitter_engagements(twitter_id);
      CREATE INDEX IF NOT EXISTS idx_twitter_engagements_tweet ON twitter_engagements(tweet_id);
      CREATE INDEX IF NOT EXISTS idx_primape_tweets_created ON primape_tweets(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_wallet_twitter_links_wallet ON wallet_twitter_links(wallet_address);
      CREATE INDEX IF NOT EXISTS idx_wallet_twitter_links_twitter ON wallet_twitter_links(twitter_id);
    `);
    console.log('✅ Created performance indexes');

    // 9. Test if we can set environment variable for PRIMAPE_TWITTER_ID
    if (!process.env.PRIMAPE_TWITTER_ID) {
      console.log('⚠️  PRIMAPE_TWITTER_ID environment variable not set');
      console.log('   Set this to @PrimapeApp\'s Twitter user ID for fetching tweets');
    }

    console.log('\n🎉 All Twitter integration tables are ready!');
    console.log('\n📋 Required Environment Variables:');
    console.log('   - TWITTER_CLIENT_ID ✅');
    console.log('   - TWITTER_CLIENT_SECRET ✅');
    console.log('   - TWITTER_CALLBACK_URL ✅');
    console.log('   - PRIMAPE_TWITTER_ID (set to @PrimapeApp user ID)');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error ensuring Twitter tables:', error);
    process.exit(1);
  }
}

// Run the setup
ensureTwitterTables(); 