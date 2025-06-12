const express = require('express');
const router = express.Router();
const twitterService = require('../services/twitterServiceV2');
const engagementService = require('../services/engagementService');

// Generate Twitter OAuth link
router.post('/auth/link', async (req, res) => {
  try {
    const userAddress = req.headers['x-wallet-address'];
    if (!userAddress) {
      return res.status(401).json({ error: 'No wallet address provided' });
    }

    const { url, codeVerifier } = await twitterService.generateAuthLink(userAddress);
    
    // In production, store codeVerifier in Redis with expiration
    // For now, return it to client to store securely
    res.json({
      auth_url: url,
      code_verifier: codeVerifier,
    });
  } catch (error) {
    console.error('Error generating Twitter auth link:', error);
    res.status(500).json({ error: 'Failed to generate auth link' });
  }
});

// Handle OAuth callback
router.post('/auth/callback', async (req, res) => {
  try {
    const userAddress = req.headers['x-wallet-address'];
    if (!userAddress) {
      return res.status(401).json({ error: 'No wallet address provided' });
    }

    const { code, code_verifier } = req.body;
    
    if (!code || !code_verifier) {
      return res.status(400).json({ error: 'Missing OAuth parameters' });
    }

    const result = await twitterService.handleCallback(code, code_verifier, userAddress);
    
    res.json(result);
  } catch (error) {
    console.error('Error handling Twitter callback:', error);
    
    // More specific error handling
    if (error.message?.includes('invalid_request') || error.code === 400) {
      return res.status(400).json({ error: 'Authorization expired. Please try linking again.' });
    }
    
    if (error.message?.includes('duplicate key') || error.code === '23505') {
      // Extract Twitter ID from error if possible
      const match = error.detail?.match(/\(([^)]+)\)/);
      const twitterId = match ? match[1] : 'This Twitter account';
      return res.status(409).json({ error: `${twitterId} is already linked to another wallet.` });
    }
    
    res.status(500).json({ error: 'Failed to link Twitter account' });
  }
});

// Check if user follows @PrimapeApp
router.get('/verify-follow', async (req, res) => {
  try {
    const userAddress = req.headers['x-wallet-address'];
    if (!userAddress) {
      return res.status(401).json({ error: 'No wallet address provided' });
    }

    const result = await twitterService.verifyFollowing(userAddress);
    
    res.json(result);
  } catch (error) {
    console.error('Error verifying follow:', error);
    res.status(500).json({ error: 'Failed to verify follow status' });
  }
});

// Get latest @PrimapeApp tweets
router.get('/primape-posts', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    console.log('🐦 Fetching @PrimapeApp posts, limit:', limit, 'offset:', offset);
    
    // First try to get real tweets from X API v2
    let tweets = [];
    let source = 'api';
    
    try {
      if (process.env.TWITTER_BEARER_TOKEN || (process.env.TWITTER_CLIENT_ID && process.env.TWITTER_CLIENT_SECRET)) {
        tweets = await fetchPrimapeTweetsFromAPI(limit, offset);
        console.log('✅ Successfully fetched', tweets.length, 'tweets from X API');
        source = 'api';
      } else {
        console.warn('⚠️ No Twitter API credentials found');
        throw new Error('No Twitter API credentials configured');
      }
    } catch (apiError) {
      console.warn('🔄 X API failed:', apiError.message); 
      
      // Try to get cached tweets from database if API fails
      try {
        const cachedResult = await require('../config/database').query(
          `SELECT tweet_id as id, content as text, created_at, engagement_stats as public_metrics, media_urls
           FROM primape_tweets 
           ORDER BY created_at DESC 
           LIMIT $1 OFFSET $2`,
          [limit, offset]
        );
        
        if (cachedResult.rows.length > 0) {
          tweets = cachedResult.rows.map(row => ({
            id: row.id,
            text: row.text,
            created_at: row.created_at,
            public_metrics: typeof row.public_metrics === 'string' ? JSON.parse(row.public_metrics) : row.public_metrics,
            media_urls: typeof row.media_urls === 'string' ? JSON.parse(row.media_urls) : row.media_urls,
            profile_image_url: 'https://pbs.twimg.com/profile_images/1234567890/primape_normal.jpg' // Placeholder for actual profile
          }));
          source = 'database_cache';
          console.log('✅ Using cached tweets from database');
        } else {
          throw new Error('No cached tweets available');
        }
      } catch (dbError) {
        console.error('❌ Database cache also failed:', dbError.message);
        // Return empty array instead of fake tweets
        tweets = [];
        source = 'no_data';
      }
    }
    
    res.json({
      tweets,
      total: tweets.length,
      source: source,
      offset: offset,
      limit: limit
    });
    
  } catch (error) {
    console.error('❌ Error in primape-posts endpoint:', error);
    
    // Return empty response instead of fake tweets
    res.json({
      tweets: [],
      total: 0,
      source: 'error',
      error: error.message
    });
  }
});

// Helper function to fetch tweets from X API v2 with rich content
async function fetchPrimapeTweetsFromAPI(limit = 10, offset = 0) {
  const primapeUserId = process.env.PRIMAPE_TWITTER_ID || 'PrimapeApp';
  
  // Method 1: Using Bearer Token (App-only auth)
  if (process.env.TWITTER_BEARER_TOKEN) {
    console.log('🔑 Using Bearer Token authentication');
    
    // Get user info first to get profile picture
    const userResponse = await fetch(`https://api.x.com/2/users/by/username/${primapeUserId}?user.fields=profile_image_url,public_metrics,verified,description`, {
      headers: {
        'Authorization': `Bearer ${process.env.TWITTER_BEARER_TOKEN}`
      }
    });
    
    if (!userResponse.ok) {
      throw new Error(`Failed to get user info: ${userResponse.status} ${userResponse.statusText}`);
    }
    
    const userData = await userResponse.json();
    const userId = userData.data?.id;
    const profileImageUrl = userData.data?.profile_image_url;
    const isVerified = userData.data?.verified;
    const publicMetrics = userData.data?.public_metrics;
    
    if (!userId) {
      throw new Error('Could not get user ID for @PrimapeApp');
    }
    
    // Get user timeline with rich content
    const timelineResponse = await fetch(`https://api.x.com/2/users/${userId}/tweets?max_results=${Math.min(limit, 100)}&tweet.fields=created_at,public_metrics,attachments,referenced_tweets,context_annotations,entities&expansions=attachments.media_keys,referenced_tweets.id,author_id&media.fields=url,preview_image_url,type,width,height&user.fields=profile_image_url,verified`, {
      headers: {
        'Authorization': `Bearer ${process.env.TWITTER_BEARER_TOKEN}`
      }
    });
    
    if (!timelineResponse.ok) {
      throw new Error(`Failed to get timeline: ${timelineResponse.status} ${timelineResponse.statusText}`);
    }
    
    const timelineData = await timelineResponse.json();
    const tweets = timelineData.data || [];
    
    // Enhance tweets with profile data and media
    const enhancedTweets = tweets.map((tweet, index) => {
      // Skip tweets based on offset
      if (index < offset) return null;
      
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
        profile_image_url: profileImageUrl?.replace('_normal', '_400x400') || profileImageUrl, // Get higher res
        author_verified: isVerified,
        author_metrics: publicMetrics,
        media_urls: mediaUrls,
        // Convert engagement stats to expected format
        engagement_stats: tweet.public_metrics || { like_count: 0, retweet_count: 0, reply_count: 0 }
      };
    }).filter(tweet => tweet !== null);
    
    // Cache tweets in database
    for (const tweet of enhancedTweets) {
      try {
        await require('../config/database').query(
          `INSERT INTO primape_tweets (tweet_id, content, media_urls, created_at, engagement_stats)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (tweet_id) DO UPDATE
           SET content = $2, engagement_stats = $5, last_updated = NOW()`,
          [
            tweet.id,
            tweet.text,
            JSON.stringify(tweet.media_urls),
            tweet.created_at,
            JSON.stringify(tweet.engagement_stats)
          ]
        );
      } catch (dbError) {
        console.warn('Failed to cache tweet:', dbError.message);
      }
    }
    
    return enhancedTweets;
  }
  
  // Method 2: Using OAuth 2.0 Client Credentials (similar enhancement)
  if (process.env.TWITTER_CLIENT_ID && process.env.TWITTER_CLIENT_SECRET) {
    console.log('🔑 Using OAuth 2.0 Client Credentials');
    
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
    
    // Get user with profile data
    const userResponse = await fetch(`https://api.x.com/2/users/by/username/${primapeUserId}?user.fields=profile_image_url,public_metrics,verified,description`, {
      headers: {
        'Authorization': `Bearer ${appToken}`
      }
    });
    
    if (!userResponse.ok) {
      throw new Error(`Failed to get user: ${userResponse.status}`);
    }
    
    const userData = await userResponse.json();
    const userId = userData.data?.id;
    const profileImageUrl = userData.data?.profile_image_url;
    const isVerified = userData.data?.verified;
    
    if (!userId) {
      throw new Error('Could not get user ID');
    }
    
    // Get tweets with rich content
    const tweetsResponse = await fetch(`https://api.x.com/2/users/${userId}/tweets?max_results=${Math.min(limit, 100)}&tweet.fields=created_at,public_metrics,attachments&expansions=attachments.media_keys&media.fields=url,preview_image_url,type,width,height`, {
      headers: {
        'Authorization': `Bearer ${appToken}`
      }
    });
    
    if (!tweetsResponse.ok) {
      throw new Error(`Failed to get tweets: ${tweetsResponse.status}`);
    }
    
    const tweetsData = await tweetsResponse.json();
    const tweets = tweetsData.data || [];
    
    // Enhance and filter tweets based on offset
    const enhancedTweets = tweets.slice(offset, offset + limit).map(tweet => {
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
    
    return enhancedTweets;
  }
  
  throw new Error('No valid Twitter API credentials found');
}

// Validate engagement on a tweet
router.post('/validate-engagement', async (req, res) => {
  try {
    const userAddress = req.headers['x-wallet-address'];
    if (!userAddress) {
      return res.status(401).json({ error: 'No wallet address provided' });
    }

    const { tweet_id, engagement_type } = req.body;
    
    if (!tweet_id || !engagement_type) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    if (!['like', 'repost', 'comment'].includes(engagement_type)) {
      return res.status(400).json({ error: 'Invalid engagement type' });
    }

    const result = await twitterService.validateEngagement(userAddress, tweet_id, engagement_type);
    
    res.json(result);
  } catch (error) {
    console.error('Error validating engagement:', error);
    res.status(500).json({ error: 'Failed to validate engagement' });
  }
});

// Queue engagement validation (new endpoint for better UX)
router.post('/queue-engagement-check', async (req, res) => {
  try {
    const userAddress = req.headers['x-wallet-address'];
    if (!userAddress) {
      return res.status(401).json({ error: 'No wallet address provided' });
    }

    const { tweet_id, engagement_type, tweet_url } = req.body;
    
    if (!tweet_id || !engagement_type) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    if (!['like', 'repost', 'comment'].includes(engagement_type)) {
      return res.status(400).json({ error: 'Invalid engagement type' });
    }

    // Store pending validation in database
    try {
      await require('../config/database').query(
        `INSERT INTO pending_twitter_validations (user_address, tweet_id, engagement_type, tweet_url, status, created_at)
         VALUES ($1, $2, $3, $4, 'pending', NOW())
         ON CONFLICT (user_address, tweet_id, engagement_type) 
         DO UPDATE SET status = 'pending', created_at = NOW()`,
        [userAddress, tweet_id, engagement_type, tweet_url]
      );

      // Return immediate response for better UX
      res.json({
        queued: true,
        message: `${engagement_type} queued for validation`,
        tweet_id,
        engagement_type,
        estimated_validation_time: '10-30 seconds'
      });

      // Perform async validation with delay to allow user time to complete action
      setTimeout(async () => {
        try {
          console.log(`🔄 Validating queued ${engagement_type} for tweet ${tweet_id}`);
          const validationResult = await twitterService.validateEngagement(userAddress, tweet_id, engagement_type);
          
          // Update pending validation status
          await require('../config/database').query(
            `UPDATE pending_twitter_validations 
             SET status = $1, validated_at = NOW(), points_awarded = $2
             WHERE user_address = $3 AND tweet_id = $4 AND engagement_type = $5`,
            [
              validationResult.valid ? 'validated' : 'failed',
              validationResult.points_awarded || 0,
              userAddress,
              tweet_id,
              engagement_type
            ]
          );

          console.log(`✅ Validation complete: ${validationResult.valid ? 'Valid' : 'Invalid'}, Points: ${validationResult.points_awarded || 0}`);
        } catch (validationError) {
          console.error('❌ Async validation failed:', validationError);
          
          // Update status to error
          await require('../config/database').query(
            `UPDATE pending_twitter_validations 
             SET status = 'error', validated_at = NOW()
             WHERE user_address = $1 AND tweet_id = $2 AND engagement_type = $3`,
            [userAddress, tweet_id, engagement_type]
          );
        }
      }, 15000); // Wait 15 seconds before validation

    } catch (dbError) {
      console.error('Failed to queue validation:', dbError);
      throw new Error('Failed to queue validation');
    }

  } catch (error) {
    console.error('Error queuing engagement validation:', error);
    res.status(500).json({ error: 'Failed to queue engagement validation' });
  }
});

// Get validation status for pending engagements
router.get('/validation-status/:userAddress', async (req, res) => {
  try {
    const { userAddress } = req.params;
    
    const result = await require('../config/database').query(
      `SELECT tweet_id, engagement_type, status, points_awarded, created_at, validated_at
       FROM pending_twitter_validations 
       WHERE user_address = $1 
       ORDER BY created_at DESC 
       LIMIT 50`,
      [userAddress]
    );

    res.json({
      validations: result.rows
    });

  } catch (error) {
    console.error('Error getting validation status:', error);
    res.status(500).json({ error: 'Failed to get validation status' });
  }
});

// Get user's Twitter engagement summary
router.get('/engagement-summary', async (req, res) => {
  try {
    const userAddress = req.headers['x-wallet-address'];
    if (!userAddress) {
      return res.status(401).json({ error: 'No wallet address provided' });
    }

    const summary = await twitterService.getUserEngagementSummary(userAddress);
    
    res.json(summary);
  } catch (error) {
    console.error('Error getting engagement summary:', error);
    res.status(500).json({ error: 'Failed to get engagement summary' });
  }
});

// Update follower count
router.post('/update-followers', async (req, res) => {
  try {
    const userAddress = req.headers['x-wallet-address'];
    if (!userAddress) {
      return res.status(401).json({ error: 'No wallet address provided' });
    }

    const followerCount = await twitterService.updateFollowerCount(userAddress);
    
    res.json({
      followers: followerCount,
      updated: true,
    });
  } catch (error) {
    console.error('Error updating follower count:', error);
    res.status(500).json({ error: 'Failed to update follower count' });
  }
});

// Get all wallets linked to a Twitter account
router.get('/linked-wallets/:twitterId', async (req, res) => {
  try {
    const { twitterId } = req.params;
    
    const linkedWallets = await twitterService.getLinkedWallets(twitterId);
    
    res.json({
      twitter_id: twitterId,
      linked_wallets: linkedWallets,
      count: linkedWallets.length
    });
  } catch (error) {
    console.error('Error getting linked wallets:', error);
    res.status(500).json({ error: 'Failed to get linked wallets' });
  }
});

// Get Twitter account info by wallet address
router.get('/twitter-by-wallet/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    
    const twitterAccount = await twitterService.getTwitterByWallet(walletAddress);
    
    if (!twitterAccount) {
      return res.status(404).json({ error: 'No Twitter account linked to this wallet' });
    }
    
    res.json(twitterAccount);
  } catch (error) {
    console.error('Error getting Twitter by wallet:', error);
    res.status(500).json({ error: 'Failed to get Twitter account' });
  }
});

// Get aggregated stats for a Twitter account
router.get('/aggregated-stats/:twitterId', async (req, res) => {
  try {
    const { twitterId } = req.params;
    
    const stats = await twitterService.getAggregatedStats(twitterId);
    
    if (!stats) {
      return res.status(404).json({ error: 'No stats found for this Twitter account' });
    }
    
    res.json(stats);
  } catch (error) {
    console.error('Error getting aggregated stats:', error);
    res.status(500).json({ error: 'Failed to get aggregated stats' });
  }
});

// Debug endpoint to test OAuth timing
router.post('/auth/debug-link', async (req, res) => {
  try {
    const { walletAddress, twitterId, username } = req.body;
    
    if (!walletAddress || !twitterId || !username) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    console.log('Debug link attempt:', { walletAddress, twitterId, username });
    
    // Simulate the Twitter callback without actual OAuth
    // Check if this Twitter account already exists
    const existingTwitter = await require('../config/database').query(
      'SELECT twitter_id FROM twitter_accounts WHERE twitter_id = $1',
      [twitterId]
    );

    if (existingTwitter.rows.length === 0) {
      // Create Twitter account
      await require('../config/database').query(
        'INSERT INTO twitter_accounts (twitter_id, twitter_username, twitter_followers) VALUES ($1, $2, 0)',
        [twitterId, username]
      );
    }

    // Check wallet constraint
    const existingLink = await require('../config/database').query(
      'SELECT twitter_id FROM wallet_twitter_links WHERE wallet_address = $1',
      [walletAddress]
    );

    if (existingLink.rows.length > 0 && existingLink.rows[0].twitter_id !== twitterId) {
      return res.status(409).json({ error: 'This wallet is already linked to a different Twitter account' });
    }

    // Create user if needed
    await require('../config/database').query(
      'INSERT INTO users (wallet_address) VALUES ($1) ON CONFLICT (wallet_address) DO NOTHING',
      [walletAddress]
    );

    // Create link
    const isFirstWallet = await require('../config/database').query(
      'SELECT COUNT(*) as count FROM wallet_twitter_links WHERE twitter_id = $1',
      [twitterId]
    );

    await require('../config/database').query(
      `INSERT INTO wallet_twitter_links (wallet_address, twitter_id, is_primary_wallet)
       VALUES ($1, $2, $3)
       ON CONFLICT (wallet_address, twitter_id) DO UPDATE
       SET linked_at = CURRENT_TIMESTAMP`,
      [walletAddress, twitterId, isFirstWallet.rows[0].count === '0']
    );

    res.json({
      success: true,
      message: 'Debug link successful',
      twitter_id: twitterId,
      twitter_username: username,
      is_new_link: existingTwitter.rows.length === 0
    });
    
  } catch (error) {
    console.error('Debug link error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 