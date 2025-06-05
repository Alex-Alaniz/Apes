const db = require('./config/database');

async function ensureTwitterTables() {
  console.log('Ensuring Twitter integration tables exist...');

  try {
    // Ensure users table has Twitter fields
    await db.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS twitter_id VARCHAR(50) UNIQUE
    `);
    
    await db.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS twitter_username VARCHAR(50)
    `);
    
    await db.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS twitter_linked_at TIMESTAMP
    `);
    
    await db.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS twitter_followers INTEGER DEFAULT 0
    `);

    console.log('✓ Updated users table with Twitter fields');

    // Create twitter_oauth_tokens table
    await db.query(`
      CREATE TABLE IF NOT EXISTS twitter_oauth_tokens (
        user_address VARCHAR(44) PRIMARY KEY REFERENCES users(wallet_address),
        access_token TEXT NOT NULL,
        refresh_token TEXT NOT NULL,
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✓ Created twitter_oauth_tokens table');

    // Create engagement_points table if it doesn't exist
    await db.query(`
      CREATE TABLE IF NOT EXISTS engagement_points (
        id SERIAL PRIMARY KEY,
        user_address VARCHAR(44) REFERENCES users(wallet_address),
        activity_type VARCHAR(50) NOT NULL,
        points_earned INTEGER NOT NULL,
        metadata JSONB,
        requires_twitter BOOLEAN DEFAULT FALSE,
        tweet_id VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✓ Created engagement_points table');

    // Create twitter_engagements table
    await db.query(`
      CREATE TABLE IF NOT EXISTS twitter_engagements (
        id SERIAL PRIMARY KEY,
        user_address VARCHAR(44) REFERENCES users(wallet_address),
        tweet_id VARCHAR(50) NOT NULL,
        engagement_type VARCHAR(20),
        points_awarded INTEGER,
        verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_address, tweet_id, engagement_type)
      )
    `);

    console.log('✓ Created twitter_engagements table');

    // Create primape_tweets table
    await db.query(`
      CREATE TABLE IF NOT EXISTS primape_tweets (
        tweet_id VARCHAR(50) PRIMARY KEY,
        content TEXT,
        media_urls JSONB,
        created_at TIMESTAMP,
        engagement_stats JSONB,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✓ Created primape_tweets table');

    console.log('\nAll Twitter integration tables are ready!');
    process.exit(0);
  } catch (error) {
    console.error('Error ensuring Twitter tables:', error);
    process.exit(1);
  }
}

ensureTwitterTables(); 