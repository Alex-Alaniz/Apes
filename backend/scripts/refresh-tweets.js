#!/usr/bin/env node

/**
 * Scheduled script to refresh @PrimapeApp tweets from X API
 * This script should be run periodically (every 2-4 hours) to keep tweets fresh
 * while minimizing X API rate limit usage.
 * 
 * Usage:
 * - Via cron: 0 */4 * * * /path/to/node /path/to/refresh-tweets.js
 * - Via Railway: Schedule this as a cron job
 * - Manually: node scripts/refresh-tweets.js
 */

const fetch = require('node-fetch');
require('dotenv').config();

// Database setup (reuse existing connection)
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function refreshTweets() {
  console.log('🔄 Starting scheduled tweet refresh...');
  console.log('📅 Timestamp:', new Date().toISOString());
  
  try {
    // Check if we have X API credentials
    if (!process.env.TWITTER_BEARER_TOKEN) {
      console.log('⚠️ No Twitter Bearer Token found, skipping API fetch');
      return;
    }
    
    if (!process.env.PRIMAPE_TWITTER_ID) {
      console.log('⚠️ No PRIMAPE_TWITTER_ID found, using default');
    }
    
    const primapeUserId = process.env.PRIMAPE_TWITTER_ID || '1869551350175961089';
    console.log('🎯 Fetching tweets for user ID:', primapeUserId);
    
    // Check when we last fetched tweets
    const { data: lastFetch } = await supabase
      .from('primape_tweets')
      .select('fetched_at')
      .order('fetched_at', { ascending: false })
      .limit(1);
    
    if (lastFetch && lastFetch.length > 0) {
      const lastFetchTime = new Date(lastFetch[0].fetched_at);
      const hoursSinceLastFetch = (Date.now() - lastFetchTime.getTime()) / (1000 * 60 * 60);
      
      console.log('🕐 Last fetch was', hoursSinceLastFetch.toFixed(1), 'hours ago');
      
      // Don't fetch if we've fetched within the last 2 hours (respect rate limits)
      if (hoursSinceLastFetch < 2) {
        console.log('✅ Tweets are fresh enough, skipping fetch');
        return;
      }
    }
    
    // Fetch tweets from X API
    const timelineUrl = `https://api.twitter.com/2/users/${primapeUserId}/tweets?max_results=25&tweet.fields=created_at,public_metrics`;
    console.log('🔗 Fetching from:', timelineUrl);
    
    const response = await fetch(timelineUrl, {
      headers: {
        'Authorization': `Bearer ${process.env.TWITTER_BEARER_TOKEN}`
      }
    });
    
    if (!response.ok) {
      if (response.status === 429) {
        console.log('⏰ Rate limited by X API - this is expected and normal');
        console.log('📊 Current rate limit headers:', {
          'x-rate-limit-remaining': response.headers.get('x-rate-limit-remaining'),
          'x-rate-limit-reset': response.headers.get('x-rate-limit-reset')
        });
        return;
      }
      
      const errorText = await response.text();
      console.error('❌ X API fetch failed:', response.status, errorText);
      throw new Error(`X API failed: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    const tweets = data.data || [];
    console.log('📥 Received', tweets.length, 'tweets from X API');
    
    if (tweets.length === 0) {
      console.log('📭 No tweets received from API');
      return;
    }
    
    // Store tweets in database
    let newTweetsCount = 0;
    let updatedTweetsCount = 0;
    
    for (const tweet of tweets) {
      try {
        // Check if tweet already exists
        const { data: existingTweet } = await supabase
          .from('primape_tweets')
          .select('id, like_count, retweet_count, reply_count')
          .eq('tweet_id', tweet.id)
          .single();
        
        const tweetData = {
          tweet_id: tweet.id,
          content: tweet.text,
          posted_at: tweet.created_at,
          like_count: tweet.public_metrics?.like_count || 0,
          retweet_count: tweet.public_metrics?.retweet_count || 0,
          reply_count: tweet.public_metrics?.reply_count || 0,
          fetched_at: new Date().toISOString()
        };
        
        if (existingTweet) {
          // Update existing tweet with fresh metrics
          const { error: updateError } = await supabase
            .from('primape_tweets')
            .update(tweetData)
            .eq('tweet_id', tweet.id);
          
          if (updateError) {
            console.error('⚠️ Failed to update tweet', tweet.id, ':', updateError.message);
          } else {
            updatedTweetsCount++;
            
            // Log if engagement metrics changed significantly
            const likeDiff = tweetData.like_count - (existingTweet.like_count || 0);
            const retweetDiff = tweetData.retweet_count - (existingTweet.retweet_count || 0);
            
            if (likeDiff > 0 || retweetDiff > 0) {
              console.log(`📈 Tweet ${tweet.id}: +${likeDiff} likes, +${retweetDiff} retweets`);
            }
          }
        } else {
          // Insert new tweet
          const { error: insertError } = await supabase
            .from('primape_tweets')
            .insert(tweetData);
          
          if (insertError) {
            console.error('⚠️ Failed to insert tweet', tweet.id, ':', insertError.message);
          } else {
            newTweetsCount++;
            console.log(`✨ New tweet stored: ${tweet.id} (${tweetData.like_count} likes)`);
          }
        }
      } catch (tweetError) {
        console.error('⚠️ Error processing tweet:', tweetError.message);
      }
    }
    
    console.log('✅ Tweet refresh completed:');
    console.log(`   📝 ${newTweetsCount} new tweets added`);
    console.log(`   🔄 ${updatedTweetsCount} tweets updated`);
    console.log(`   📊 Total processed: ${tweets.length}`);
    
    // Cleanup old tweets (keep last 100)
    const { error: cleanupError } = await supabase
      .from('primape_tweets')
      .delete()
      .not('id', 'in', `(
        SELECT id FROM primape_tweets 
        ORDER BY posted_at DESC 
        LIMIT 100
      )`);
    
    if (cleanupError) {
      console.error('⚠️ Failed to cleanup old tweets:', cleanupError.message);
    } else {
      console.log('🧹 Cleaned up old tweets (keeping most recent 100)');
    }
    
  } catch (error) {
    console.error('❌ Tweet refresh failed:', error.message);
    console.error('🔍 Error details:', error.stack);
    
    // This is not a fatal error - the application will continue to serve
    // tweets from the database or fallback content
    process.exit(1);
  }
}

// Run the refresh
refreshTweets()
  .then(() => {
    console.log('🎉 Tweet refresh script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Tweet refresh script failed:', error);
    process.exit(1);
  }); 