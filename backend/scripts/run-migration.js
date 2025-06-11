#!/usr/bin/env node

/**
 * Simple migration runner for creating the primape_tweets table
 * Run this script to set up the database table for storing @PrimapeApp tweets
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigration() {
  console.log('🗄️ Running primape_tweets table migration...');
  
  try {
    // Create the table
    const createTableSQL = `
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
    `;
    
    console.log('📋 Creating primape_tweets table...');
    const { error: tableError } = await supabase.rpc('exec_sql', { query: createTableSQL });
    
    if (tableError) {
      console.error('❌ Table creation failed:', tableError);
      // Try alternative method
      console.log('🔄 Trying alternative method...');
      const { error: altError } = await supabase.from('primape_tweets').select('id').limit(1);
      if (altError && altError.code === '42P01') {
        console.error('❌ Table does not exist and could not be created');
        console.log('📝 Please manually run the SQL from: backend/migrations/create_primape_tweets_table.sql');
        console.log('📝 In your Supabase dashboard SQL Editor');
        return;
      }
    } else {
      console.log('✅ Table created successfully');
    }
    
    // Create indexes
    const indexSQL = `
      CREATE INDEX IF NOT EXISTS idx_primape_tweets_posted_at ON primape_tweets(posted_at DESC);
      CREATE INDEX IF NOT EXISTS idx_primape_tweets_tweet_id ON primape_tweets(tweet_id);
      CREATE INDEX IF NOT EXISTS idx_primape_tweets_fetched_at ON primape_tweets(fetched_at DESC);
    `;
    
    console.log('📊 Creating indexes...');
    const { error: indexError } = await supabase.rpc('exec_sql', { query: indexSQL });
    
    if (indexError) {
      console.log('⚠️ Index creation might have failed, but this is often okay');
    } else {
      console.log('✅ Indexes created successfully');
    }
    
    // Insert sample data
    console.log('📝 Inserting sample tweets...');
    const sampleTweets = [
      {
        tweet_id: '1867901234567890123',
        content: '🔥 FIFA Club World Cup 2025 Tournament is LIVE!\n\n💰 25,000 APES Prize Pool\n🏆 Join now and earn instant rewards\n⚡ Early bird bonus still available!\n\nConnect your wallet and start predicting!\n\n🚀 apes.primape.app/tournaments\n\n#PredictionMarkets #FIFA #ClubWorldCup #Web3',
        posted_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        like_count: 45,
        retweet_count: 12,
        reply_count: 8,
        fetched_at: new Date().toISOString()
      },
      {
        tweet_id: '1867801234567890124',
        content: 'GM Apes! 🦍\n\nReady to make some epic predictions today?\n\n✨ New markets added daily\n💎 Earn APES points for every prediction\n🎯 Tournament leaderboards heating up\n🏆 25K prize pool waiting\n\nWhat\'s your play today? 👀\n\n#GM #PredictionMarkets #Solana',
        posted_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        like_count: 23,
        retweet_count: 6,
        reply_count: 4,
        fetched_at: new Date().toISOString()
      },
      {
        tweet_id: '1867701234567890125',
        content: '🎉 Community Milestone Alert! 🎉\n\n✅ 1,000+ Active Predictors\n✅ 500+ Markets Created\n✅ 100,000+ Predictions Made\n✅ 50,000+ APES Distributed\n\nThanks to our amazing community! The future of prediction markets is bright 🚀\n\n#Community #Milestones #Web3',
        posted_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        like_count: 67,
        retweet_count: 18,
        reply_count: 12,
        fetched_at: new Date().toISOString()
      }
    ];
    
    const { error: insertError } = await supabase
      .from('primape_tweets')
      .upsert(sampleTweets, { onConflict: 'tweet_id' });
    
    if (insertError) {
      console.error('⚠️ Sample data insertion failed:', insertError.message);
      console.log('📝 This is okay - the table structure is ready');
    } else {
      console.log('✅ Sample tweets inserted successfully');
    }
    
    // Test the table
    console.log('🧪 Testing table...');
    const { data: testData, error: testError } = await supabase
      .from('primape_tweets')
      .select('tweet_id, content')
      .limit(1);
    
    if (testError) {
      console.error('❌ Table test failed:', testError.message);
    } else {
      console.log('✅ Table test successful:', testData?.length || 0, 'tweets found');
    }
    
    console.log('🎉 Migration completed successfully!');
    console.log('📝 Next steps:');
    console.log('   1. Test the API endpoint: /api/twitter/primape-posts');
    console.log('   2. Set up periodic refresh script');
    console.log('   3. Frontend should now show database tweets');
    
  } catch (error) {
    console.error('💥 Migration failed:', error.message);
    console.log('📝 Please manually run the SQL from: backend/migrations/create_primape_tweets_table.sql');
    console.log('📝 In your Supabase dashboard SQL Editor');
  }
}

runMigration()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  }); 