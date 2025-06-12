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
    console.log('🐦 Fetching @PrimapeApp posts from cache, limit:', limit, 'offset:', offset);
    
    // Always serve from database cache to avoid rate limits
    try {
      const cachedResult = await require('../config/database').query(
        `SELECT 
           tweet_id as id, 
           content as text, 
           created_at, 
           engagement_stats, 
           media_urls,
           profile_image_url,
           author_verified,
           updated_at as last_updated
         FROM primape_tweets 
         WHERE updated_at > NOW() - INTERVAL '48 hours'
         ORDER BY created_at DESC 
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );
      
      if (cachedResult.rows.length > 0) {
        const tweets = cachedResult.rows.map(row => ({
          id: row.id,
          text: row.text,
          created_at: row.created_at,
          public_metrics: typeof row.engagement_stats === 'string' ? JSON.parse(row.engagement_stats) : row.engagement_stats,
          engagement_stats: typeof row.engagement_stats === 'string' ? JSON.parse(row.engagement_stats) : row.engagement_stats,
          media_urls: typeof row.media_urls === 'string' ? JSON.parse(row.media_urls) : row.media_urls,
          profile_image_url: row.profile_image_url || 'https://pbs.twimg.com/profile_images/default_profile_normal.png',
          author_verified: row.author_verified || false,
          last_cached: row.last_updated
        }));
        
        console.log(`✅ Serving ${tweets.length} cached tweets from database`);
        
        // Get cache status for additional info
        const cacheStatus = await require('../config/database').query(
          `SELECT last_successful_fetch, next_scheduled_fetch, tweets_fetched 
           FROM tweet_cache_status 
           ORDER BY id DESC LIMIT 1`
        );
        
        res.json({
          tweets,
          total: tweets.length,
          source: 'database_cache',
          offset: offset,
          limit: limit,
          cache_info: {
            last_update: cacheStatus.rows[0]?.last_successful_fetch,
            next_scheduled: cacheStatus.rows[0]?.next_scheduled_fetch,
            cached_count: cacheStatus.rows[0]?.tweets_fetched
          }
        });
        return;
      } else {
        console.log('⚠️ No cached tweets found in database');
      }
    } catch (dbError) {
      console.error('❌ Database cache query failed:', dbError.message);
    }
    
    // If no cached tweets available, return empty with helpful message
    console.log('📭 No tweets available in cache, waiting for next scheduled fetch');
    
    res.json({
      tweets: [],
      total: 0,
      source: 'cache_empty',
      message: 'Tweets are cached every 2-3 hours. Please check back soon!',
      offset: offset,
      limit: limit
    });
    
  } catch (error) {
    console.error('❌ Error in primape-posts endpoint:', error);
    
    res.json({
      tweets: [],
      total: 0,
      source: 'error',
      error: error.message,
      message: 'Unable to load tweets. Our system will retry automatically.'
    });
  }
});

// Add cache status endpoint for monitoring
router.get('/cache-status', async (req, res) => {
  try {
    // Get cache analytics
    const analytics = await require('../config/database').query(
      'SELECT * FROM tweet_cache_analytics'
    );
    
    // Get cache status
    const status = await require('../config/database').query(
      `SELECT * FROM tweet_cache_status ORDER BY id DESC LIMIT 1`
    );
    
    // Get recent tweets summary
    const recentTweets = await require('../config/database').query(
      `SELECT tweet_id, created_at, last_updated 
       FROM primape_tweets 
       ORDER BY last_updated DESC 
       LIMIT 5`
    );
    
    res.json({
      analytics: analytics.rows[0] || {},
      status: status.rows[0] || {},
      recent_tweets: recentTweets.rows,
      cache_health: {
        has_recent_data: analytics.rows[0]?.recent_tweets > 0,
        needs_refresh: !status.rows[0]?.last_successful_fetch || 
                      new Date(status.rows[0].last_successful_fetch) < new Date(Date.now() - 4 * 60 * 60 * 1000),
        api_rate_limited: status.rows[0]?.api_rate_limited || false
      }
    });
    
  } catch (error) {
    console.error('❌ Error getting cache status:', error);
    res.status(500).json({ error: 'Failed to get cache status' });
  }
});

// Manual cache refresh endpoint (for admin use)
router.post('/refresh-cache', async (req, res) => {
  try {
    const userAddress = req.headers['x-wallet-address'];
    
    // In production, you might want to restrict this to admin users
    if (!userAddress) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    console.log('🔄 Manual cache refresh requested by:', userAddress);
    
    // Import and trigger the cache service
    const tweetCacheService = require('../services/tweetCacheService');
    
    // Force a fetch (don't wait for scheduled time)
    tweetCacheService.forceFetch();
    
    res.json({
      success: true,
      message: 'Cache refresh initiated. Check back in a few minutes.',
      triggered_by: userAddress,
      triggered_at: new Date()
    });
    
  } catch (error) {
    console.error('❌ Error refreshing cache:', error);
    res.status(500).json({ error: 'Failed to refresh cache' });
  }
});

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
          
          // First check if user has linked Twitter account
          const twitterAccount = await require('../config/database').query(
            'SELECT twitter_id FROM wallet_twitter_links WHERE wallet_address = $1',
            [userAddress]
          );

          if (twitterAccount.rows.length === 0) {
            console.log(`⚠️ User ${userAddress} has not linked Twitter account`);
            await require('../config/database').query(
              `UPDATE pending_twitter_validations 
               SET status = 'failed', validated_at = NOW(), points_awarded = 0
               WHERE user_address = $1 AND tweet_id = $2 AND engagement_type = $3`,
              [userAddress, tweet_id, engagement_type]
            );
            return;
          }

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

          if (validationResult.valid && validationResult.points_awarded > 0) {
            console.log(`✅ Validation successful: ${validationResult.points_awarded} points awarded`);
          } else {
            console.log(`❌ Validation failed: User did not ${engagement_type} the tweet`);
          }

        } catch (validationError) {
          console.error('❌ Async validation failed:', validationError.message);
          
          // Determine error type for better user feedback
          let errorStatus = 'error';
          if (validationError.message.includes('not linked') || validationError.message.includes('not properly linked')) {
            errorStatus = 'not_linked';
          } else if (validationError.message.includes('expired') || validationError.message.includes('authentication')) {
            errorStatus = 'auth_expired';
          }
          
          // Update status with error type
          await require('../config/database').query(
            `UPDATE pending_twitter_validations 
             SET status = $1, validated_at = NOW(), points_awarded = 0
             WHERE user_address = $2 AND tweet_id = $3 AND engagement_type = $4`,
            [errorStatus, userAddress, tweet_id, engagement_type]
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