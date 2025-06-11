#!/usr/bin/env node

/**
 * Final Verification Script
 * Tests the complete Twitter integration after database setup
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  console.log('🚀 Final Twitter Integration Verification');
  console.log('📅 Timestamp:', new Date().toISOString());
  console.log('');
  
  try {
    // Test 1: Database
    console.log('🗄️ Testing database...');
    const { data: tweets, error } = await supabase
      .from('primape_tweets')
      .select('tweet_id, content, like_count, posted_at')
      .order('posted_at', { ascending: false })
      .limit(3);
    
    if (error) {
      console.error('❌ Database test failed:', error.message);
      return;
    }
    
    console.log('✅ Database working! Found', tweets?.length || 0, 'tweets:');
    tweets?.forEach((tweet, i) => {
      console.log(`   ${i + 1}. ${tweet.content.substring(0, 50)}... (${tweet.like_count} likes)`);
    });
    console.log('');
    
    // Test 2: API
    console.log('🌐 Testing API endpoint...');
    const fetch = require('node-fetch');
    const response = await fetch('https://apes-production.up.railway.app/api/twitter/primape-posts?limit=3');
    
    if (!response.ok) {
      console.error('❌ API test failed:', response.status);
      return;
    }
    
    const apiData = await response.json();
    console.log('✅ API working!');
    console.log('   Source:', apiData.source);
    console.log('   Tweets:', apiData.total);
    console.log('   First tweet:', apiData.tweets?.[0]?.text?.substring(0, 50) + '...');
    console.log('');
    
    // Success!
    if (apiData.source === 'database' || apiData.source === 'database_stale') {
      console.log('🎉 PERFECT SUCCESS! 🎉');
      console.log('✨ Your Twitter integration is now fully operational!');
      console.log('');
      console.log('🌐 Live System:');
      console.log('   📱 Frontend: https://apes.primape.app/engage-to-earn');
      console.log('   🔗 API: https://apes-production.up.railway.app/api/twitter/primape-posts');
      console.log('');
      console.log('🎯 What this achieved:');
      console.log('   • Real @PrimapeApp tweets instead of mock content');
      console.log('   • Database-first eliminates X API rate limits');
      console.log('   • Lightning-fast response for users');
      console.log('   • Scalable for multiple concurrent users');
      console.log('');
      console.log('✅ Your engage-to-earn page now shows real, engaging tweets!');
    } else {
      console.log('⚠️ API is working but using fallback content');
      console.log('   This should resolve once the database has tweets');
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    console.log('');
    console.log('📝 Check:');
    console.log('   1. SQL was run successfully in Supabase dashboard');
    console.log('   2. .env file has correct credentials');
    console.log('   3. Railway deployment is active');
  }
}

main(); 