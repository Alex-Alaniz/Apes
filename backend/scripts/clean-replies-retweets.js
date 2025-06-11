#!/usr/bin/env node

/**
 * Clean Replies and Retweets Script
 * Removes all replies and retweets from database, keeping only original @PrimapeApp posts
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const credentials = {
  SUPABASE_URL: "https://xovbmbsnlcmxinlmlimz.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvdmJtYnNubGNteGlubG1saW16Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODY0NjUwNSwiZXhwIjoyMDY0MjIyNTA1fQ.J3_P7Y-u1OGD9gZlQ1FCHx5pPccPLhfttZOiu-_myOU"
};

const supabase = createClient(credentials.SUPABASE_URL, credentials.SUPABASE_SERVICE_ROLE_KEY);

async function cleanRepliesAndRetweets() {
  console.log('🧹 Cleaning replies and retweets from database...');
  
  try {
    // First, get all tweets to analyze
    const { data: allTweets, error: fetchError } = await supabase
      .from('primape_tweets')
      .select('tweet_id, content')
      .order('posted_at', { ascending: false });
      
    if (fetchError) {
      console.error('❌ Error fetching tweets:', fetchError);
      return;
    }
    
    console.log(`📊 Found ${allTweets.length} total tweets in database`);
    
    // Identify replies and retweets
    const repliesToDelete = [];
    const retweetsToDelete = [];
    const originalPosts = [];
    
    allTweets.forEach(tweet => {
      // Check if it's a retweet
      if (tweet.content.startsWith('RT @')) {
        retweetsToDelete.push(tweet.tweet_id);
        return;
      }
      
      // Check if it's a reply (starts with @)
      if (tweet.content.startsWith('@')) {
        repliesToDelete.push(tweet.tweet_id);
        return;
      }
      
      // It's an original post
      originalPosts.push(tweet.tweet_id);
    });
    
    console.log(`🔍 Analysis complete:`);
    console.log(`  ✅ Original posts: ${originalPosts.length}`);
    console.log(`  🚫 Retweets to delete: ${retweetsToDelete.length}`);
    console.log(`  🚫 Replies to delete: ${repliesToDelete.length}`);
    
    // Delete retweets
    if (retweetsToDelete.length > 0) {
      console.log(`🗑️ Deleting ${retweetsToDelete.length} retweets...`);
      const { error: deleteRtError } = await supabase
        .from('primape_tweets')
        .delete()
        .in('tweet_id', retweetsToDelete);
        
      if (deleteRtError) {
        console.error('❌ Error deleting retweets:', deleteRtError);
      } else {
        console.log(`✅ Deleted ${retweetsToDelete.length} retweets`);
      }
    }
    
    // Delete replies
    if (repliesToDelete.length > 0) {
      console.log(`🗑️ Deleting ${repliesToDelete.length} replies...`);
      const { error: deleteReplyError } = await supabase
        .from('primape_tweets')
        .delete()
        .in('tweet_id', repliesToDelete);
        
      if (deleteReplyError) {
        console.error('❌ Error deleting replies:', deleteReplyError);
      } else {
        console.log(`✅ Deleted ${repliesToDelete.length} replies`);
      }
    }
    
    // Verify cleanup
    const { data: remainingTweets, error: verifyError } = await supabase
      .from('primape_tweets')
      .select('tweet_id, content, posted_at')
      .order('posted_at', { ascending: false })
      .limit(10);
      
    if (verifyError) {
      console.error('❌ Error verifying cleanup:', verifyError);
      return;
    }
    
    console.log('\n📊 Remaining tweets (top 10):');
    remainingTweets.forEach((tweet, index) => {
      const preview = tweet.content.substring(0, 60) + '...';
      const age = Math.round((Date.now() - new Date(tweet.posted_at).getTime()) / (1000 * 60 * 60));
      console.log(`${index + 1}. ${tweet.tweet_id} (${age}h ago) - ${preview}`);
    });
    
    // Check for any remaining replies or retweets
    const stillHasReplies = remainingTweets.some(t => t.content.startsWith('@'));
    const stillHasRetweets = remainingTweets.some(t => t.content.startsWith('RT @'));
    
    if (stillHasReplies || stillHasRetweets) {
      console.error('⚠️ WARNING: Still found replies or retweets after cleanup!');
    } else {
      console.log('✅ All replies and retweets successfully removed');
    }
    
    console.log(`\n🎉 Database now contains ${remainingTweets.length || originalPosts.length} original @PrimapeApp posts only!`);
    
  } catch (error) {
    console.error('❌ Error in cleanup:', error);
  }
}

// Run the cleanup
cleanRepliesAndRetweets(); 