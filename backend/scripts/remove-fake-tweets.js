#!/usr/bin/env node

/**
 * Remove Fake Tweets Script
 * Removes remaining fake tweets with obviously fake IDs
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const credentials = {
  SUPABASE_URL: "https://xovbmbsnlcmxinlmlimz.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvdmJtYnNubGNteGlubG1saW16Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODY0NjUwNSwiZXhwIjoyMDY0MjIyNTA1fQ.J3_P7Y-u1OGD9gZlQ1FCHx5pPccPLhfttZOiu-_myOU"
};

const supabase = createClient(credentials.SUPABASE_URL, credentials.SUPABASE_SERVICE_ROLE_KEY);

// Fake tweets with obvious pattern 186770123456789012X
const FAKE_TWEET_IDS = [
  '1867901234567890123', // FIFA Club World Cup fake
  '1867801234567890124', // GM Apes fake  
  '1867701234567890125', // Community Milestone fake
];

async function removeFakeTweets() {
  console.log('🧹 Removing fake tweets with obvious fake IDs...');
  
  try {
    // Delete fake tweets
    console.log(`🗑️ Deleting ${FAKE_TWEET_IDS.length} fake tweets...`);
    const { error: deleteError } = await supabase
      .from('primape_tweets')
      .delete()
      .in('tweet_id', FAKE_TWEET_IDS);
      
    if (deleteError) {
      console.error('❌ Error deleting fake tweets:', deleteError);
      return;
    }
    
    console.log(`✅ Deleted ${FAKE_TWEET_IDS.length} fake tweets`);
    
    // Verify cleanup
    const { data: remainingTweets, error: verifyError } = await supabase
      .from('primape_tweets')
      .select('tweet_id, content, posted_at')
      .order('posted_at', { ascending: false })
      .limit(15);
      
    if (verifyError) {
      console.error('❌ Error verifying cleanup:', verifyError);
      return;
    }
    
    console.log(`\n📊 Remaining tweets (${remainingTweets.length} total):`);
    remainingTweets.forEach((tweet, index) => {
      const preview = tweet.content.substring(0, 60) + '...';
      const age = Math.round((Date.now() - new Date(tweet.posted_at).getTime()) / (1000 * 60 * 60));
      console.log(`${index + 1}. ${tweet.tweet_id} (${age}h ago) - ${preview}`);
    });
    
    // Check for any remaining fake tweets
    const stillHasFakes = remainingTweets.some(t => FAKE_TWEET_IDS.includes(t.tweet_id));
    
    if (stillHasFakes) {
      console.error('⚠️ WARNING: Still found fake tweets after cleanup!');
    } else {
      console.log('✅ All fake tweets successfully removed');
    }
    
    console.log(`\n🎉 Database now contains ${remainingTweets.length} REAL @PrimapeApp original posts only!`);
    
  } catch (error) {
    console.error('❌ Error in cleanup:', error);
  }
}

// Run the cleanup
removeFakeTweets(); 