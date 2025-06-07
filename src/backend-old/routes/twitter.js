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
    
    const tweets = await twitterService.fetchPrimapeTweets(limit);
    
    res.json({
      tweets,
      total: tweets.length,
    });
  } catch (error) {
    console.error('Error fetching Primape tweets:', error);
    res.status(500).json({ error: 'Failed to fetch tweets' });
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