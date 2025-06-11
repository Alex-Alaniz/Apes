#!/usr/bin/env node

/**
 * Clean Fake Tweets Script
 * Removes fake tweets and ensures only real @PrimapeApp original posts
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const credentials = {
  SUPABASE_URL: "https://xovbmbsnlcmxinlmlimz.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvdmJtYnNubGNteGlubG1saW16Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODY0NjUwNSwiZXhwIjoyMDY0MjIyNTA1fQ.J3_P7Y-u1OGD9gZlQ1FCHx5pPccPLhfttZOiu-_myOU",
  TWITTER_BEARER_TOKEN: "AAAAAAAAAAAAAAAAAAAAAHcBwwEAAAAAKyHv15xqKE%2BSDJJnKu4LFE%2Fk4LA%3DdFsWwe0aFQIRkLCUnrBQ7qvDTFP8bGPKLCBz1lTMIE5BVIVJBg",
  PRIMAPE_TWITTER_ID: "1869551350175961089"
};

const supabase = createClient(credentials.SUPABASE_URL, credentials.SUPABASE_SERVICE_ROLE_KEY);

// Fake tweet IDs with obvious patterns
const FAKE_TWEET_IDS = [
  '1867901234567890123', // FIFA Club World Cup fake
  '1867801234567890124', // GM Apes fake  
  '1867701234567890125', // Community Milestone fake
];

async function cleanFakeTweets() {
  console.log('🧹 Cleaning fake tweets from database...');
  
  try {
    // Remove fake tweets
    const { data: deleted, error: deleteError } = await supabase
      .from('primape_tweets')
      .delete()
      .in('id', FAKE_TWEET_IDS);
      
    if (deleteError) {
      console.error('❌ Error removing fake tweets:', deleteError);
      return;
    }
    
    console.log(`✅ Removed ${FAKE_TWEET_IDS.length} fake tweets`);
    
    // Fetch real tweets to replace them
    await fetchRealTweets();
    
    // Verify cleanup
    await verifyCleanup();
    
  } catch (error) {
    console.error('❌ Error in cleanup:', error);
  }
}

async function fetchRealTweets() {
  console.log('🐦 Fetching real @PrimapeApp tweets (original posts only)...');
  
  try {
    const bearerToken = credentials.TWITTER_BEARER_TOKEN.replace('%3D', '=');
    
    // Enhanced query to exclude replies and retweets
    const tweetFields = 'id,text,created_at,author_id,public_metrics,referenced_tweets,in_reply_to_user_id';
    const userFields = 'id,name,username,verified';
    const excludeFields = 'replies,retweets'; // Exclude replies and RTs
    
    const url = `https://api.twitter.com/2/users/${credentials.PRIMAPE_TWITTER_ID}/tweets?` +
              `tweet.fields=${tweetFields}&` +
              `user.fields=${userFields}&` +
              `exclude=${excludeFields}&` +
              `max_results=100`; // Get more tweets for 48h coverage
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${bearerToken}`,
        'User-Agent': 'PrimapeApp/1.0'
      }
    });
    
    if (!response.ok) {
      console.error('❌ X API Error:', response.status, response.statusText);
      return;
    }
    
    const data = await response.json();
    
    if (!data.data || data.data.length === 0) {
      console.log('⚠️ No tweets returned from X API');
      return;
    }
    
    console.log(`🐦 Fetched ${data.data.length} original tweets from X API`);
    
    // Filter out replies and retweets manually for extra safety
    const originalTweets = data.data.filter(tweet => {
      // Skip if it's a reply
      if (tweet.in_reply_to_user_id) return false;
      
      // Skip if it's a retweet
      if (tweet.text.startsWith('RT @')) return false;
      
      // Skip if it has referenced tweets (replies, quotes, retweets)
      if (tweet.referenced_tweets && tweet.referenced_tweets.length > 0) {
        return false;
      }
      
      return true;
    });
    
    console.log(`✅ Filtered to ${originalTweets.length} original posts (no replies/RTs)`);
    
    // Store in database
    for (const tweet of originalTweets) {
      const tweetData = {
        id: tweet.id,
        text: tweet.text,
        created_at: tweet.created_at,
        author_id: tweet.author_id,
        likes: tweet.public_metrics?.like_count || 0,
        retweets: tweet.public_metrics?.retweet_count || 0,
        replies: tweet.public_metrics?.reply_count || 0,
        quotes: tweet.public_metrics?.quote_count || 0,
        impressions: tweet.public_metrics?.impression_count || 0,
        source: 'x_api',
        updated_at: new Date().toISOString()
      };
      
      const { error: upsertError } = await supabase
        .from('primape_tweets')
        .upsert(tweetData, { onConflict: 'id' });
        
      if (upsertError) {
        console.error('❌ Error upserting tweet:', tweet.id, upsertError);
      } else {
        console.log(`✅ Stored tweet: ${tweet.id.substring(0, 10)}... (${tweet.public_metrics?.like_count || 0} likes)`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error fetching real tweets:', error);
  }
}

async function verifyCleanup() {
  console.log('🔍 Verifying cleanup...');
  
  try {
    const { data: tweets, error } = await supabase
      .from('primape_tweets')
      .select('id, text, likes, source, created_at')
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (error) {
      console.error('❌ Error verifying:', error);
      return;
    }
    
    console.log('\n📊 Current tweets in database:');
    tweets.forEach((tweet, index) => {
      const preview = tweet.text.substring(0, 60) + '...';
      const age = Math.round((Date.now() - new Date(tweet.created_at).getTime()) / (1000 * 60 * 60));
      console.log(`${index + 1}. ${tweet.id} (${tweet.likes} likes, ${age}h ago) - ${preview}`);
    });
    
    // Check for fake tweets
    const fakeStillPresent = tweets.filter(t => FAKE_TWEET_IDS.includes(t.id));
    if (fakeStillPresent.length > 0) {
      console.error('❌ WARNING: Fake tweets still present:', fakeStillPresent.map(t => t.id));
    } else {
      console.log('✅ No fake tweets detected');
    }
    
    console.log(`\n🎉 Database now contains ${tweets.length} real @PrimapeApp original posts!`);
    
  } catch (error) {
    console.error('❌ Error in verification:', error);
  }
}

// Run the cleanup
cleanFakeTweets(); 