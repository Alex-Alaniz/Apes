#!/usr/bin/env node

/**
 * Direct SQL Setup Script
 * Creates the database table using direct SQL execution
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function createTableDirectly() {
  console.log('🔧 Creating primape_tweets table directly...');
  
  const createTableSQL = `
    -- Create table for storing @PrimapeApp tweets
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
  
  const createIndexesSQL = `
    -- Create indexes for better performance
    CREATE INDEX IF NOT EXISTS idx_primape_tweets_posted_at ON primape_tweets(posted_at DESC);
    CREATE INDEX IF NOT EXISTS idx_primape_tweets_tweet_id ON primape_tweets(tweet_id);
    CREATE INDEX IF NOT EXISTS idx_primape_tweets_fetched_at ON primape_tweets(fetched_at DESC);
  `;
  
  try {
    // Execute table creation
    const { error: tableError } = await supabase.rpc('exec_sql', { query: createTableSQL });
    if (tableError) {
      console.log('⚠️ Standard RPC failed, trying alternative approach...');
      
      // Alternative: Use raw SQL query
      const { error: altError } = await supabase
        .from('primape_tweets') 
        .select('count', { count: 'exact', head: true });
      
      if (altError && altError.message.includes('does not exist')) {
        console.log('❌ Table does not exist. Please run this SQL manually in Supabase dashboard:');
        console.log('');
        console.log('=== COPY THIS SQL TO SUPABASE SQL EDITOR ===');
        console.log(createTableSQL);
        console.log(createIndexesSQL);
        console.log('=== END SQL ===');
        console.log('');
        console.log('📝 Steps:');
        console.log('1. Go to https://supabase.com/dashboard');
        console.log('2. Select your project');
        console.log('3. Go to SQL Editor');
        console.log('4. Paste the SQL above and run it');
        return false;
      }
    } else {
      console.log('✅ Table created successfully!');
      
      // Create indexes
      const { error: indexError } = await supabase.rpc('exec_sql', { query: createIndexesSQL });
      if (!indexError) {
        console.log('✅ Indexes created successfully!');
      }
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ SQL execution failed:', error.message);
    return false;
  }
}

async function insertSampleData() {
  console.log('📝 Inserting sample tweets...');
  
  const sampleTweets = [
    {
      tweet_id: '1867901234567890123',
      content: '🔥 FIFA Club World Cup 2025 Tournament is LIVE!\n\n💰 25,000 APES Prize Pool\n🏆 Join now and earn instant rewards\n⚡ Early bird bonus still available!\n\nConnect your wallet and start predicting!\n\n🚀 apes.primape.app/tournaments\n\n#PredictionMarkets #FIFA #ClubWorldCup #Web3',
      posted_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      like_count: 45,
      retweet_count: 12,
      reply_count: 8
    },
    {
      tweet_id: '1867801234567890124',
      content: 'GM Apes! 🦍\n\nReady to make some epic predictions today?\n\n✨ New markets added daily\n💎 Earn APES points for every prediction\n🎯 Tournament leaderboards heating up\n🏆 25K prize pool waiting\n\nWhat\'s your play today? 👀\n\n#GM #PredictionMarkets #Solana',
      posted_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      like_count: 23,
      retweet_count: 6,
      reply_count: 4
    },
    {
      tweet_id: '1867701234567890125',
      content: '🎉 Community Milestone Alert! 🎉\n\n✅ 1,000+ Active Predictors\n✅ 500+ Markets Created\n✅ 100,000+ Predictions Made\n✅ 50,000+ APES Distributed\n\nThanks to our amazing community! The future of prediction markets is bright 🚀\n\n#Community #Milestones #Web3',
      posted_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      like_count: 67,
      retweet_count: 18,
      reply_count: 12
    }
  ];
  
  try {
    const { data, error } = await supabase
      .from('primape_tweets')
      .upsert(sampleTweets, { onConflict: 'tweet_id' })
      .select();
    
    if (error) {
      console.error('❌ Sample data insertion failed:', error.message);
      return false;
    } else {
      console.log('✅ Successfully inserted', data?.length || sampleTweets.length, 'sample tweets');
      return true;
    }
  } catch (error) {
    console.error('❌ Error inserting sample tweets:', error.message);
    return false;
  }
}

async function testEverything() {
  console.log('🧪 Testing database and API...');
  
  try {
    // Test database
    const { data: tweets, error } = await supabase
      .from('primape_tweets')
      .select('tweet_id, content, like_count')
      .order('posted_at', { ascending: false })
      .limit(3);
    
    if (error) {
      console.error('❌ Database test failed:', error.message);
      return false;
    }
    
    console.log('✅ Database working! Found', tweets?.length || 0, 'tweets');
    tweets?.forEach((tweet, i) => {
      console.log(`   ${i + 1}. ${tweet.content.substring(0, 40)}... (${tweet.like_count} likes)`);
    });
    
    // Test API
    console.log('🌐 Testing API endpoint...');
    const fetch = require('node-fetch');
    const response = await fetch('https://apes-production.up.railway.app/api/twitter/primape-posts?limit=3');
    
    if (!response.ok) {
      console.error('❌ API test failed:', response.status);
      return false;
    }
    
    const apiData = await response.json();
    console.log('✅ API working! Source:', apiData.source, 'Tweets:', apiData.total);
    
    return true;
    
  } catch (error) {
    console.error('❌ Testing failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Direct SQL Setup Starting...');
  console.log('');
  
  // Step 1: Create table
  const tableCreated = await createTableDirectly();
  if (!tableCreated) {
    console.log('❌ Please create the table manually first, then re-run this script');
    return;
  }
  console.log('');
  
  // Step 2: Insert sample data
  const dataInserted = await insertSampleData();
  if (!dataInserted) {
    console.log('❌ Sample data insertion failed');
    return;
  }
  console.log('');
  
  // Step 3: Test everything
  const testsPass = await testEverything();
  if (!testsPass) {
    console.log('❌ Tests failed');
    return;
  }
  console.log('');
  
  console.log('🎉 SUCCESS! Twitter integration is now fully operational!');
  console.log('');
  console.log('🌐 Live URLs:');
  console.log('   Frontend: https://apes.primape.app/engage-to-earn');
  console.log('   API: https://apes-production.up.railway.app/api/twitter/primape-posts');
  console.log('');
  console.log('✅ Your database-first Twitter integration is complete!');
}

main().catch(error => {
  console.error('💥 Setup failed:', error.message);
  process.exit(1);
}); 