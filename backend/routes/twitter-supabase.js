const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const engagementService = require('../services/engagementService');
const crypto = require('crypto');

console.log('🐦 TWITTER-SUPABASE ROUTES LOADING...');
console.log('🔍 Environment check on routes load:', {
  bearer_token: process.env.TWITTER_BEARER_TOKEN ? 'SET' : 'NOT_SET',
  client_id: process.env.TWITTER_CLIENT_ID ? 'SET' : 'NOT_SET', 
  client_secret: process.env.TWITTER_CLIENT_SECRET ? 'SET' : 'NOT_SET',
  primape_id: process.env.PRIMAPE_TWITTER_ID
});

// Store OAuth states temporarily (in production, use Redis or database)
const oauthStore = new Map();

// Helper function to generate code verifier and challenge for PKCE
function generatePKCE() {
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  
  return {
    codeVerifier,
    codeChallenge
  };
}

// Simple test endpoint to verify routes are loading
router.get('/test', (req, res) => {
  console.log('🔍 Twitter routes test endpoint hit');
  res.json({
    message: 'Twitter routes are working!',
    timestamp: new Date().toISOString(),
    env_check: {
      has_bearer_token: !!process.env.TWITTER_BEARER_TOKEN,
      has_client_id: !!process.env.TWITTER_CLIENT_ID,
      has_client_secret: !!process.env.TWITTER_CLIENT_SECRET,
      primape_twitter_id: process.env.PRIMAPE_TWITTER_ID
    }
  });
});

// Generate Twitter OAuth 2.0 link (with PKCE)
router.post('/auth/link', async (req, res) => {
  try {
    const userAddress = req.headers['x-wallet-address'];
    if (!userAddress) {
      return res.status(401).json({ error: 'No wallet address provided' });
    }

    // Check if Twitter OAuth is configured
    if (!process.env.TWITTER_CLIENT_ID || !process.env.TWITTER_CLIENT_SECRET || !process.env.TWITTER_CALLBACK_URL) {
      console.warn('⚠️ Twitter OAuth not configured, using debug mode');
      return res.json({
        auth_url: null,
        debug_mode: true,
        message: 'Twitter OAuth not configured. Use /auth/debug-link endpoint for testing.',
        debug_endpoint: '/api/twitter/auth/debug-link'
      });
    }

    // Clean up old entries (older than 10 minutes)
    for (const [key, value] of oauthStore.entries()) {
      if (Date.now() - value.timestamp > 600000) {
        oauthStore.delete(key);
      }
    }

    // Generate PKCE parameters
    const { codeVerifier, codeChallenge } = generatePKCE();
    const state = crypto.randomBytes(16).toString('hex');

    // Store state and code verifier for callback
    oauthStore.set(state, {
      codeVerifier,
      userAddress,
      timestamp: Date.now()
    });

    // OAuth 2.0 authorization URL
    const scopes = encodeURIComponent('users.read tweet.read offline.access');
    const authUrl = `https://x.com/i/oauth2/authorize?` +
      `response_type=code&` +
      `client_id=${encodeURIComponent(process.env.TWITTER_CLIENT_ID)}&` +
      `redirect_uri=${encodeURIComponent(process.env.TWITTER_CALLBACK_URL)}&` +
      `scope=${scopes}&` +
      `state=${encodeURIComponent(state)}&` +
      `code_challenge=${encodeURIComponent(codeChallenge)}&` +
      `code_challenge_method=S256`;
    
    console.log('✅ Generated Twitter OAuth 2.0 URL for:', userAddress);
    
    res.json({
      auth_url: authUrl,
      state: state,
      debug_mode: false,
      message: 'Click the auth_url to connect your Twitter account'
    });
  } catch (error) {
    console.error('Error generating Twitter auth link:', error);
    res.status(500).json({ error: 'Failed to generate auth link' });
  }
});

// Handle OAuth callback (OAuth 2.0 with PKCE)
router.post('/auth/callback', async (req, res) => {
  try {
    const { code, state } = req.body;
    
    if (!code || !state) {
      return res.status(400).json({ error: 'Missing authorization code or state' });
    }

    // Retrieve stored state data
    const storedData = oauthStore.get(state);
    if (!storedData) {
      return res.status(400).json({ error: 'Invalid or expired state parameter' });
    }

    const { codeVerifier, userAddress } = storedData;
    oauthStore.delete(state); // Clean up

    // Exchange authorization code for access token
    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: process.env.TWITTER_CALLBACK_URL,
      code_verifier: codeVerifier,
      client_id: process.env.TWITTER_CLIENT_ID
    });

    // For confidential clients, use Basic Auth header
    const auth = Buffer.from(`${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`).toString('base64');

    const tokenResponse = await fetch('https://api.x.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${auth}`
      },
      body: tokenParams.toString()
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('X token exchange failed:', errorData);
      return res.status(400).json({ error: 'Failed to exchange authorization code' });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      throw new Error('No access token received from X');
    }

    // Get user details using OAuth 2.0 API
    const userResponse = await fetch('https://api.x.com/2/users/me?user.fields=public_metrics,username', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!userResponse.ok) {
      const errorData = await userResponse.text();
      console.error('X user info request failed:', errorData);
      return res.status(400).json({ error: 'Failed to get user information' });
    }

    const userData = await userResponse.json();
    const user = userData.data;

    if (!user) {
      throw new Error('No user data received from X');
    }

    const twitterId = user.id;
    const username = user.username;
    const followers = user.public_metrics?.followers_count || 0;

    // Link Twitter account
    await linkTwitterAccount(userAddress, twitterId, username, followers);

    res.json({
      success: true,
      message: 'Twitter account linked successfully',
      twitter_id: twitterId,
      twitter_username: username,
      followers: followers
    });

  } catch (error) {
    console.error('Error handling Twitter callback:', error);
    res.status(500).json({ error: 'Failed to link Twitter account' });
  }
});

// Quick test endpoint to check if we get past callback route
router.get('/route-test-1', (req, res) => {
  console.log('🔍 Route test 1 hit - past callback route');
  res.json({ message: 'Route test 1 working' });
});

// Helper function to link Twitter account
async function linkTwitterAccount(walletAddress, twitterId, username, followers = 0) {
  // Check if this Twitter account already exists
  const { data: existingTwitter, error: twitterCheckError } = await supabase
    .from('twitter_accounts')
    .select('twitter_id')
    .eq('twitter_id', twitterId)
    .single();
  
  if (twitterCheckError && twitterCheckError.code !== 'PGRST116') {
    throw new Error('Database error checking Twitter account');
  }

  const isNewTwitterAccount = !existingTwitter;

  // Create Twitter account if it doesn't exist
  if (isNewTwitterAccount) {
    const { error: createTwitterError } = await supabase
      .from('twitter_accounts')
      .insert({
        twitter_id: twitterId,
        twitter_username: username,
        twitter_followers: followers
      });
    
    if (createTwitterError) {
      throw new Error('Failed to create Twitter account');
    }
  }

  // Update user with Twitter info
  const { error: userUpdateError } = await supabase
    .from('users')
    .upsert({
      wallet_address: walletAddress,
      twitter_id: twitterId,
      twitter_username: username,
      twitter_followers: followers,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'wallet_address'
    });
  
  if (userUpdateError) {
    throw new Error('Failed to update user with Twitter info');
  }

  // Create wallet-Twitter link
  const { error: linkCreateError } = await supabase
    .from('wallet_twitter_links')
    .upsert({
      wallet_address: walletAddress,
      twitter_id: twitterId,
      is_primary_wallet: true,
      linked_at: new Date().toISOString()
    }, {
      onConflict: 'wallet_address,twitter_id'
    });
  
  if (linkCreateError) {
    throw new Error('Failed to create Twitter link');
  }

  // Award points for linking Twitter
  try {
    await engagementService.trackActivity(walletAddress, 'LINK_TWITTER');
  } catch (pointsError) {
    console.error('⚠️ Failed to award Twitter linking points:', pointsError.message);
  }

  return { isNewTwitterAccount };
}

// Debug endpoint to manually link Twitter (for testing)
router.post('/auth/debug-link', async (req, res) => {
  try {
    const { walletAddress, twitterId, username } = req.body;
    
    if (!walletAddress || !twitterId || !username) {
      return res.status(400).json({ error: 'Missing required fields: walletAddress, twitterId, username' });
    }
    
    console.log('🔗 Debug Twitter link attempt:', { walletAddress, twitterId, username });
    
    await linkTwitterAccount(walletAddress, twitterId, username);

    console.log('✅ Twitter link successful for:', walletAddress);

    res.json({
      success: true,
      message: 'Twitter account linked successfully (debug mode)',
      twitter_id: twitterId,
      twitter_username: username,
      debug_mode: true
    });
    
  } catch (error) {
    console.error('❌ Debug Twitter link error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get Twitter account info by wallet address
router.get('/twitter-by-wallet/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    
    const { data: userTwitter, error: userError } = await supabase
      .from('users')
      .select('twitter_id, twitter_username, twitter_followers')
      .eq('wallet_address', walletAddress)
      .single();
    
    if (userError && userError.code !== 'PGRST116') {
      console.error('Error getting user Twitter info:', userError);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!userTwitter || !userTwitter.twitter_id) {
      return res.status(404).json({ error: 'No Twitter account linked to this wallet' });
    }
    
    res.json({
      twitter_id: userTwitter.twitter_id,
      twitter_username: userTwitter.twitter_username,
      twitter_followers: userTwitter.twitter_followers
    });
  } catch (error) {
    console.error('Error getting Twitter by wallet:', error);
    res.status(500).json({ error: 'Failed to get Twitter account' });
  }
});

// Get all wallets linked to a Twitter account
router.get('/linked-wallets/:twitterId', async (req, res) => {
  try {
    const { twitterId } = req.params;
    
    const { data: linkedWallets, error: linkError } = await supabase
      .from('wallet_twitter_links')
      .select('wallet_address, is_primary_wallet, linked_at')
      .eq('twitter_id', twitterId);
    
    if (linkError) {
      console.error('Error getting linked wallets:', linkError);
      return res.status(500).json({ error: 'Failed to get linked wallets' });
    }
    
    res.json({
      twitter_id: twitterId,
      linked_wallets: linkedWallets || [],
      count: linkedWallets ? linkedWallets.length : 0
    });
  } catch (error) {
    console.error('Error getting linked wallets:', error);
    res.status(500).json({ error: 'Failed to get linked wallets' });
  }
});

// Check if user has Twitter linked
router.get('/check-link/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    
    const { data: userTwitter, error: userError } = await supabase
      .from('users')
      .select('twitter_id, twitter_username')
      .eq('wallet_address', walletAddress)
      .single();
    
    if (userError && userError.code !== 'PGRST116') {
      console.error('Error checking Twitter link:', userError);
      return res.status(500).json({ error: 'Database error' });
    }
    
    const hasTwitter = userTwitter && userTwitter.twitter_id;
    
    res.json({
      has_twitter_linked: !!hasTwitter,
      twitter_username: hasTwitter ? userTwitter.twitter_username : null
    });
  } catch (error) {
    console.error('Error checking Twitter link:', error);
    res.status(500).json({ error: 'Failed to check Twitter link' });
  }
});

// Unlink Twitter account
router.delete('/unlink/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    
    // Remove Twitter info from users table
    const { error: userUpdateError } = await supabase
      .from('users')
      .update({
        twitter_id: null,
        twitter_username: null,
        twitter_followers: 0,
        updated_at: new Date().toISOString()
      })
      .eq('wallet_address', walletAddress);
    
    if (userUpdateError) {
      console.error('Error updating user Twitter info:', userUpdateError);
      return res.status(500).json({ error: 'Failed to unlink Twitter account' });
    }
    
    // Remove wallet-Twitter link
    const { error: linkDeleteError } = await supabase
      .from('wallet_twitter_links')
      .delete()
      .eq('wallet_address', walletAddress);
    
    if (linkDeleteError) {
      console.error('Error deleting wallet-Twitter link:', linkDeleteError);
      // Continue anyway as user table was updated
    }
    
    console.log('✅ Twitter unlinked for:', walletAddress);
    
    res.json({
      success: true,
      message: 'Twitter account unlinked successfully'
    });
    
  } catch (error) {
    console.error('Error unlinking Twitter:', error);
    res.status(500).json({ error: 'Failed to unlink Twitter account' });
  }
});

// Quick test endpoint to check if we get past more routes
router.get('/route-test-2', (req, res) => {
  console.log('🔍 Route test 2 hit - before primape-posts');
  res.json({ message: 'Route test 2 working' });
});

// Get latest @PrimapeApp tweets - SIMPLIFIED VERSION FOR TESTING
router.get('/primape-posts', async (req, res) => {
  try {
    console.log('🐦 PRIMAPE-POSTS ENDPOINT HIT! (Simplified version)');
    const limit = parseInt(req.query.limit) || 10;
    
    // For now, just return fallback content to test route registration
    const tweets = [
      {
        id: '1867901234567890123',
        text: '🔥 FIFA Club World Cup 2025 Tournament is LIVE!\n\n💰 25,000 APES Prize Pool\n🏆 Join now and earn instant rewards\n⚡ Early bird bonus still available!\n\nConnect your wallet and start predicting!\n\n🚀 apes.primape.app/tournaments\n\n#PredictionMarkets #FIFA #ClubWorldCup #Web3',
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        public_metrics: { like_count: 45, retweet_count: 12, reply_count: 8 }
      },
      {
        id: '1867801234567890124',
        text: 'GM Apes! 🦍\n\nReady to make some epic predictions today?\n\n✨ New markets added daily\n💎 Earn APES points for every prediction\n🎯 Tournament leaderboards heating up\n🏆 25K prize pool waiting\n\nWhat\'s your play today? 👀\n\n#GM #PredictionMarkets #Solana',
        created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        public_metrics: { like_count: 23, retweet_count: 6, reply_count: 4 }
      }
    ].slice(0, limit);
    
         console.log('✅ Returning', tweets.length, 'test tweets');
     res.json({
       tweets,
       total: tweets.length,
       source: 'simplified_test_version'
     });
   } catch (error) {
     console.error('❌ Error in simplified primape-posts:', error);
     res.status(500).json({ error: 'Failed to fetch tweets' });
   }
});

console.log('✅ TWITTER-SUPABASE ROUTES REGISTERED:', [
  'GET /test',
  'POST /auth/link', 
  'POST /auth/callback',
  'GET /route-test-1',
  'POST /auth/debug-link',
  'GET /twitter-by-wallet/:walletAddress',
  'GET /linked-wallets/:twitterId',
  'GET /check-link/:walletAddress',
  'DELETE /unlink/:walletAddress',
  'GET /route-test-2',
  'GET /primape-posts (SIMPLIFIED)'
]);

module.exports = router; 