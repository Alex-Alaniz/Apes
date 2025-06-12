const cron = require('node-cron');
const db = require('../config/database');

class TweetCacheService {
  constructor() {
    // Prevent multiple instances
    if (global.tweetCacheServiceStarted) {
      console.log('⚠️ Tweet cache service already running, skipping duplicate start');
      return;
    }
    
    this.isRunning = false;
    this.lastFetchTime = null;
    this.startScheduledFetching();
    global.tweetCacheServiceStarted = true;
  }

  // Start the scheduled tweet fetching (every 2 hours)
  startScheduledFetching() {
    console.log('🔄 Starting scheduled tweet cache service...');
    
    // Run every 2 hours: 0 */2 * * * (at minute 0 of every 2nd hour)
    cron.schedule('0 */2 * * *', async () => {
      console.log('⏰ Scheduled tweet fetch triggered');
      await this.fetchAndCacheTweets();
    });

    // Also run immediately on startup if no recent cache
    this.checkAndRunInitialFetch();
  }

  async checkAndRunInitialFetch() {
    try {
      const recentTweets = await db.query(
        `SELECT COUNT(*) as count FROM primape_tweets 
         WHERE updated_at > NOW() - INTERVAL '3 hours'`
      );

      if (parseInt(recentTweets.rows[0].count) === 0) {
        console.log('🚀 No recent tweets in cache, running initial fetch...');
        await this.fetchAndCacheTweets();
      } else {
        console.log('✅ Recent tweets found in cache, skipping initial fetch');
      }
    } catch (error) {
      console.error('❌ Error checking initial cache:', error);
    }
  }

  async fetchAndCacheTweets() {
    if (this.isRunning) {
      console.log('⚠️ Tweet fetch already in progress, skipping...');
      return;
    }

    this.isRunning = true;
    this.lastFetchTime = new Date();

    try {
      console.log('🐦 Starting scheduled tweet cache update...');

      // Clean up old tweets (older than 48 hours)
      await this.cleanupOldTweets();

      // Fetch new tweets from X API
      const newTweets = await this.fetchTweetsFromAPI();

      if (newTweets && newTweets.length > 0) {
        console.log(`📥 Caching ${newTweets.length} new tweets...`);
        await this.cacheTweets(newTweets);
        console.log('✅ Tweet cache updated successfully');
      } else {
        console.log('⚠️ No new tweets fetched from API');
      }

    } catch (error) {
      console.error('❌ Error in scheduled tweet fetch:', error);
    } finally {
      this.isRunning = false;
    }
  }

  async cleanupOldTweets() {
    try {
      const result = await db.query(
        `DELETE FROM primape_tweets 
         WHERE updated_at < NOW() - INTERVAL '48 hours'
         RETURNING tweet_id`
      );

      if (result.rows.length > 0) {
        console.log(`🧹 Cleaned up ${result.rows.length} old tweets (>48h)`);
      }
    } catch (error) {
      console.error('❌ Error cleaning up old tweets:', error);
    }
  }

  async fetchTweetsFromAPI() {
    try {
      // Use username instead of user ID for the /users/by/username endpoint
      const primapeUsername = 'PrimapeApp'; // Always use the actual username
      const primapeUserId = process.env.PRIMAPE_TWITTER_ID; // Keep ID for direct API calls if needed
      
      console.log(`🔍 Fetching tweets for @${primapeUsername}`);
      
      let tweets = [];

      // Method 1: Using Bearer Token
      if (process.env.TWITTER_BEARER_TOKEN) {
        console.log('🔑 Using Bearer Token for scheduled fetch');
        tweets = await this.fetchWithBearerToken(primapeUsername);
      }
      // Method 2: Using OAuth 2.0 Client Credentials  
      else if (process.env.TWITTER_CLIENT_ID && process.env.TWITTER_CLIENT_SECRET) {
        console.log('🔑 Using OAuth 2.0 Client Credentials for scheduled fetch');
        tweets = await this.fetchWithClientCredentials(primapeUsername);
      } else {
        throw new Error('No Twitter API credentials configured');
      }

      return tweets;
    } catch (error) {
      console.error('❌ Error fetching tweets from API:', error.message);
      return [];
    }
  }

  async fetchWithBearerToken(primapeUsername) {
    try {
      // Get user info and profile picture with better error handling
      console.log(`🔍 Looking up Twitter user: @${primapeUsername}`);
      
      const userResponse = await fetch(`https://api.x.com/2/users/by/username/${primapeUsername}?user.fields=profile_image_url,public_metrics,verified,description`, {
        headers: {
          'Authorization': `Bearer ${process.env.TWITTER_BEARER_TOKEN}`
        }
      });

      if (!userResponse.ok) {
        const errorText = await userResponse.text();
        console.error(`❌ Twitter API user fetch failed (${userResponse.status}):`, errorText);
        
        // If it's a rate limit, that's not a critical error
        if (userResponse.status === 429) {
          console.log('⏰ Twitter API rate limited, will try again next cycle');
          return [];
        }
        
        // If it's 400, might be invalid credentials or username
        if (userResponse.status === 400) {
          console.error('🔑 Twitter API returned 400 - check credentials and username');
          console.error('💡 Verify TWITTER_BEARER_TOKEN is valid and @PrimapeApp exists');
          return [];
        }
        
        throw new Error(`Failed to get user info: ${userResponse.status} - ${errorText}`);
      }

      const userData = await userResponse.json();
      
      if (!userData.data) {
        console.error('❌ No user data returned from Twitter API');
        console.error('💡 Check if username @PrimapeApp is correct');
        return [];
      }
      
      const userId = userData.data?.id;
      const profileImageUrl = userData.data?.profile_image_url;
      const isVerified = userData.data?.verified;

      if (!userId) {
        console.error('❌ Could not get user ID for @PrimapeApp');
        return [];
      }

      console.log(`✅ Found Twitter user: ${userData.data.username} (ID: ${userId})`);

      // Get recent tweets (last 50 to ensure we get enough after filtering)
      const timelineResponse = await fetch(`https://api.x.com/2/users/${userId}/tweets?max_results=50&tweet.fields=created_at,public_metrics,attachments,referenced_tweets,context_annotations,entities&expansions=attachments.media_keys,referenced_tweets.id,author_id&media.fields=url,preview_image_url,type,width,height&user.fields=profile_image_url,verified`, {
        headers: {
          'Authorization': `Bearer ${process.env.TWITTER_BEARER_TOKEN}`
        }
      });

      if (!timelineResponse.ok) {
        const errorText = await timelineResponse.text();
        console.error(`❌ Twitter timeline fetch failed (${timelineResponse.status}):`, errorText);
        return [];
      }

      const timelineData = await timelineResponse.json();
      const tweets = timelineData.data || [];

      console.log(`📥 Fetched ${tweets.length} raw tweets from Twitter API`);

      // Filter for original tweets only (no replies or retweets)
      const originalTweets = tweets.filter(tweet => {
        // Exclude replies (tweets that start with @username)
        if (tweet.text.trim().startsWith('@')) return false;
        
        // Exclude retweets
        if (tweet.referenced_tweets?.some(ref => ref.type === 'retweeted')) return false;
        
        // Only include tweets from the last 24 hours to keep content fresh
        const tweetDate = new Date(tweet.created_at);
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        if (tweetDate < oneDayAgo) return false;

        return true;
      });

      console.log(`✅ Filtered to ${originalTweets.length} original tweets from last 24h`);

      // Enhance tweets with profile data and media
      return originalTweets.map(tweet => {
        const mediaUrls = [];
        if (tweet.attachments && timelineData.includes?.media) {
          tweet.attachments.media_keys?.forEach(key => {
            const media = timelineData.includes.media.find(m => m.media_key === key);
            if (media) {
              mediaUrls.push({
                url: media.url || media.preview_image_url,
                type: media.type,
                width: media.width,
                height: media.height
              });
            }
          });
        }

        return {
          ...tweet,
          profile_image_url: profileImageUrl?.replace('_normal', '_400x400') || profileImageUrl,
          author_verified: isVerified,
          media_urls: mediaUrls,
          engagement_stats: tweet.public_metrics || { like_count: 0, retweet_count: 0, reply_count: 0 }
        };
      });
    } catch (error) {
      console.error('❌ Error in fetchWithBearerToken:', error.message);
      return [];
    }
  }

  async fetchWithClientCredentials(primapeUsername) {
    try {
      // Get app-only bearer token
      const auth = Buffer.from(`${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`).toString('base64');

      const tokenResponse = await fetch('https://api.x.com/2/oauth2/token', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'grant_type=client_credentials'
      });

      if (!tokenResponse.ok) {
        throw new Error(`Failed to get app token: ${tokenResponse.status}`);
      }

      const tokenData = await tokenResponse.json();
      const appToken = tokenData.access_token;

      console.log(`🔍 Looking up Twitter user: @${primapeUsername} (using client credentials)`);
      
      // Use the same logic as bearer token method but with app token
      const userResponse = await fetch(`https://api.x.com/2/users/by/username/${primapeUsername}?user.fields=profile_image_url,public_metrics,verified,description`, {
        headers: {
          'Authorization': `Bearer ${appToken}`
        }
      });

      if (!userResponse.ok) {
        const errorText = await userResponse.text();
        console.error(`❌ Twitter API user fetch failed (${userResponse.status}):`, errorText);
        return [];
      }

      const userData = await userResponse.json();
      
      if (!userData.data) {
        console.error('❌ No user data returned from Twitter API');
        return [];
      }
      
      const userId = userData.data?.id;
      const profileImageUrl = userData.data?.profile_image_url;
      const isVerified = userData.data?.verified;

      if (!userId) {
        console.error('❌ Could not get user ID for @PrimapeApp');
        return [];
      }

      console.log(`✅ Found Twitter user: ${userData.data.username} (ID: ${userId})`);

      const tweetsResponse = await fetch(`https://api.x.com/2/users/${userId}/tweets?max_results=50&tweet.fields=created_at,public_metrics,attachments&expansions=attachments.media_keys&media.fields=url,preview_image_url,type,width,height`, {
        headers: {
          'Authorization': `Bearer ${appToken}`
        }
      });

      if (!tweetsResponse.ok) {
        const errorText = await tweetsResponse.text();
        console.error(`❌ Twitter timeline fetch failed (${tweetsResponse.status}):`, errorText);
        return [];
      }

      const tweetsData = await tweetsResponse.json();
      const tweets = tweetsData.data || [];

      console.log(`📥 Fetched ${tweets.length} raw tweets from Twitter API`);

      // Same filtering logic as bearer token method
      const originalTweets = tweets.filter(tweet => {
        if (tweet.text.trim().startsWith('@')) return false;
        if (tweet.referenced_tweets?.some(ref => ref.type === 'retweeted')) return false;
        
        const tweetDate = new Date(tweet.created_at);
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        if (tweetDate < oneDayAgo) return false;

        return true;
      });

      console.log(`✅ Filtered to ${originalTweets.length} original tweets from last 24h`);

      return originalTweets.map(tweet => {
        const mediaUrls = [];
        if (tweet.attachments && tweetsData.includes?.media) {
          tweet.attachments.media_keys?.forEach(key => {
            const media = tweetsData.includes.media.find(m => m.media_key === key);
            if (media) {
              mediaUrls.push({
                url: media.url || media.preview_image_url,
                type: media.type,
                width: media.width,
                height: media.height
              });
            }
          });
        }

        return {
          ...tweet,
          profile_image_url: profileImageUrl?.replace('_normal', '_400x400') || profileImageUrl,
          author_verified: isVerified,
          media_urls: mediaUrls,
          engagement_stats: tweet.public_metrics || { like_count: 0, retweet_count: 0, reply_count: 0 }
        };
      });
    } catch (error) {
      console.error('❌ Error in fetchWithClientCredentials:', error.message);
      return [];
    }
  }

  async cacheTweets(tweets) {
    for (const tweet of tweets) {
      try {
        await db.query(
          `INSERT INTO primape_tweets (
             tweet_id, content, media_urls, created_at, posted_at, 
             engagement_stats, profile_image_url, author_verified,
             like_count, retweet_count, reply_count, updated_at
           )
           VALUES ($1, $2, $3, $4, $4, $5, $6, $7, $8, $9, $10, NOW())
           ON CONFLICT (tweet_id) DO UPDATE
           SET content = $2, engagement_stats = $5, profile_image_url = $6, 
               author_verified = $7, like_count = $8, retweet_count = $9, 
               reply_count = $10, updated_at = NOW()`,
          [
            tweet.id,
            tweet.text,
            JSON.stringify(tweet.media_urls),
            tweet.created_at,
            JSON.stringify(tweet.engagement_stats),
            tweet.profile_image_url,
            tweet.author_verified,
            tweet.engagement_stats?.like_count || 0,
            tweet.engagement_stats?.retweet_count || 0,
            tweet.engagement_stats?.reply_count || 0
          ]
        );
      } catch (error) {
        console.error(`❌ Error caching tweet ${tweet.id}:`, error);
      }
    }
    
    // Update cache status
    try {
      await db.query('SELECT update_cache_status($1, false, NULL)', [tweets.length]);
    } catch (statusError) {
      console.error('❌ Error updating cache status:', statusError);
    }
  }

  // Manual trigger for testing/debugging
  async forceFetch() {
    console.log('🔄 Manual tweet fetch triggered');
    await this.fetchAndCacheTweets();
  }

  // Get cache status
  async getCacheStatus() {
    try {
      const result = await db.query(
        `SELECT 
           COUNT(*) as total_tweets,
           MAX(updated_at) as last_update,
           MIN(updated_at) as oldest_update
         FROM primape_tweets`
      );

      return {
        total_tweets: parseInt(result.rows[0].total_tweets),
        last_update: result.rows[0].last_update,
        oldest_update: result.rows[0].oldest_update,
        last_fetch_time: this.lastFetchTime,
        is_running: this.isRunning
      };
    } catch (error) {
      console.error('❌ Error getting cache status:', error);
      return null;
    }
  }
}

module.exports = new TweetCacheService(); 