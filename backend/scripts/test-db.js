#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testDatabase() {
  console.log('🗄️ Testing database connection and table...');
  
  try {
    // Try to query the table
    const { data, error } = await supabase
      .from('primape_tweets')
      .select('id')
      .limit(1);
    
    if (error) {
      console.log('❌ Table does not exist:', error.message);
      console.log('📋 Creating table manually...');
      
      // Insert sample data to trigger table creation by Supabase
      const sampleTweet = {
        tweet_id: 'sample-' + Date.now(),
        content: 'Sample tweet for table creation',
        posted_at: new Date().toISOString(),
        like_count: 0,
        retweet_count: 0,
        reply_count: 0,
        fetched_at: new Date().toISOString()
      };
      
      const { error: insertError } = await supabase
        .from('primape_tweets')
        .insert(sampleTweet);
      
      if (insertError) {
        console.error('❌ Cannot create table automatically:', insertError.message);
        console.log('📝 Please manually create the table in Supabase dashboard');
        console.log('📝 Go to: https://supabase.com/dashboard -> SQL Editor');
        console.log('📝 Run the SQL from: backend/migrations/create_primape_tweets_table.sql');
        return false;
      } else {
        console.log('✅ Table created successfully with sample data');
      }
    } else {
      console.log('✅ Table exists and accessible');
      console.log('📊 Found', data?.length || 0, 'existing records');
    }
    
    return true;
    
  } catch (err) {
    console.error('💥 Database connection error:', err.message);
    return false;
  }
}

async function insertSampleTweets() {
  console.log('📝 Inserting sample @PrimapeApp tweets...');
  
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
  
  try {
    const { error } = await supabase
      .from('primape_tweets')
      .upsert(sampleTweets, { onConflict: 'tweet_id' });
    
    if (error) {
      console.warn('⚠️ Sample data insertion failed:', error.message);
      return false;
    } else {
      console.log('✅ Sample tweets inserted successfully');
      return true;
    }
  } catch (err) {
    console.error('💥 Error inserting sample tweets:', err.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting database migration and testing...');
  
  const tableOk = await testDatabase();
  if (!tableOk) {
    console.log('❌ Database setup failed');
    process.exit(1);
  }
  
  const samplesOk = await insertSampleTweets();
  if (!samplesOk) {
    console.log('⚠️ Sample data insertion failed, but table is ready');
  }
  
  console.log('🎉 Database setup completed successfully!');
  console.log('📝 Next: Test the API endpoint');
}

main().catch(err => {
  console.error('💥 Script failed:', err.message);
  process.exit(1);
}); 