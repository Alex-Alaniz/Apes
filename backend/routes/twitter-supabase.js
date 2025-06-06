const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const engagementService = require('../services/engagementService');
const crypto = require('crypto');

// OAuth 1.0a helper functions
function generateOAuthSignature(method, url, params, consumerSecret, tokenSecret = '') {
  // Create parameter string
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');
  
  // Create signature base string
  const signatureBaseString = `${method.toUpperCase()}&${encodeURIComponent(url)}&${encodeURIComponent(sortedParams)}`;
  
  // Create signing key
  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;
  
  // Generate signature
  const signature = crypto.createHmac('sha1', signingKey).update(signatureBaseString).digest('base64');
  
  return signature;
}

function generateOAuthHeader(params) {
  const oauthParams = Object.keys(params)
    .filter(key => key.startsWith('oauth_'))
    .sort()
    .map(key => `${encodeURIComponent(key)}="${encodeURIComponent(params[key])}"`)
    .join(', ');
  
  return `OAuth ${oauthParams}`;
}

// Store OAuth tokens temporarily (in production, use Redis or database)
const oauthStore = new Map();

// Generate Twitter OAuth link (OAuth 1.0a Step 1: Request Token)
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

    // Step 1: Obtain request token from X
    const oauthParams = {
      oauth_callback: process.env.TWITTER_CALLBACK_URL,
      oauth_consumer_key: process.env.TWITTER_CLIENT_ID,
      oauth_nonce: crypto.randomBytes(16).toString('hex'),
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      oauth_version: '1.0'
    };

    // Generate signature for request token
    const signature = generateOAuthSignature(
      'POST',
      'https://api.x.com/oauth/request_token',
      oauthParams,
      process.env.TWITTER_CLIENT_SECRET
    );
    
    oauthParams.oauth_signature = signature;
    
    // Make request to X for request token
    const requestTokenResponse = await fetch('https://api.x.com/oauth/request_token', {
      method: 'POST',
      headers: {
        'Authorization': generateOAuthHeader(oauthParams),
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    if (!requestTokenResponse.ok) {
      const errorText = await requestTokenResponse.text();
      console.error('X request token error:', errorText);
      throw new Error('Failed to get request token from X');
    }

    const requestTokenData = await requestTokenResponse.text();
    const tokenParams = new URLSearchParams(requestTokenData);
    
    const oauthToken = tokenParams.get('oauth_token');
    const oauthTokenSecret = tokenParams.get('oauth_token_secret');
    const oauthCallbackConfirmed = tokenParams.get('oauth_callback_confirmed');

    if (!oauthToken || !oauthTokenSecret || oauthCallbackConfirmed !== 'true') {
      throw new Error('Invalid response from X request token');
    }

    // Store token data for callback
    oauthStore.set(oauthToken, {
      tokenSecret: oauthTokenSecret,
      userAddress,
      timestamp: Date.now()
    });

    // Step 2: Build authorization URL
    const authUrl = `https://api.x.com/oauth/authenticate?oauth_token=${oauthToken}`;
    
    console.log('✅ Generated Twitter OAuth 1.0a URL for:', userAddress);
    
    res.json({
      auth_url: authUrl,
      oauth_token: oauthToken,
      debug_mode: false,
      message: 'Click the auth_url to connect your Twitter account'
    });
  } catch (error) {
    console.error('Error generating Twitter auth link:', error);
    res.status(500).json({ error: 'Failed to generate auth link' });
  }
});

// Handle OAuth callback (OAuth 1.0a Step 3: Convert to Access Token)
router.post('/auth/callback', async (req, res) => {
  try {
    const { oauth_token, oauth_verifier } = req.body;
    
    if (!oauth_token || !oauth_verifier) {
      return res.status(400).json({ error: 'Missing oauth_token or oauth_verifier' });
    }

    // Retrieve stored token data
    const storedData = oauthStore.get(oauth_token);
    if (!storedData) {
      return res.status(400).json({ error: 'Invalid or expired oauth_token' });
    }

    const { tokenSecret, userAddress } = storedData;
    oauthStore.delete(oauth_token); // Clean up

    // Step 3: Exchange request token for access token
    const accessTokenParams = {
      oauth_consumer_key: process.env.TWITTER_CLIENT_ID,
      oauth_nonce: crypto.randomBytes(16).toString('hex'),
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      oauth_token: oauth_token,
      oauth_version: '1.0'
    };

    // Generate signature for access token request
    const accessTokenSignature = generateOAuthSignature(
      'POST',
      'https://api.x.com/oauth/access_token',
      accessTokenParams,
      process.env.TWITTER_CLIENT_SECRET,
      tokenSecret
    );
    
    accessTokenParams.oauth_signature = accessTokenSignature;

    // Request access token
    const accessTokenResponse = await fetch('https://api.x.com/oauth/access_token', {
      method: 'POST',
      headers: {
        'Authorization': generateOAuthHeader(accessTokenParams),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `oauth_verifier=${oauth_verifier}`
    });

    if (!accessTokenResponse.ok) {
      const errorData = await accessTokenResponse.text();
      console.error('X access token exchange failed:', errorData);
      return res.status(400).json({ error: 'Failed to exchange oauth_verifier' });
    }

    const accessTokenData = await accessTokenResponse.text();
    const accessParams = new URLSearchParams(accessTokenData);
    
    const finalAccessToken = accessParams.get('oauth_token');
    const finalAccessTokenSecret = accessParams.get('oauth_token_secret');
    const userId = accessParams.get('user_id');
    const screenName = accessParams.get('screen_name');

    if (!finalAccessToken || !finalAccessTokenSecret || !userId || !screenName) {
      throw new Error('Invalid access token response from X');
    }

    // For OAuth 1.0a, we can use the account/verify_credentials endpoint
    // to get additional user info like follower count
    const verifyParams = {
      oauth_consumer_key: process.env.TWITTER_CLIENT_ID,
      oauth_nonce: crypto.randomBytes(16).toString('hex'),
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      oauth_token: finalAccessToken,
      oauth_version: '1.0'
    };

    const verifySignature = generateOAuthSignature(
      'GET',
      'https://api.x.com/1.1/account/verify_credentials.json',
      verifyParams,
      process.env.TWITTER_CLIENT_SECRET,
      finalAccessTokenSecret
    );
    
    verifyParams.oauth_signature = verifySignature;

    // Get user details
    const userResponse = await fetch('https://api.x.com/1.1/account/verify_credentials.json', {
      headers: {
        'Authorization': generateOAuthHeader(verifyParams)
      }
    });

    let followers = 0;
    if (userResponse.ok) {
      const userData = await userResponse.json();
      followers = userData.followers_count || 0;
    }

    // Link Twitter account
    await linkTwitterAccount(userAddress, userId, screenName, followers);

    res.json({
      success: true,
      message: 'Twitter account linked successfully',
      twitter_id: userId,
      twitter_username: screenName,
      followers: followers
    });

  } catch (error) {
    console.error('Error handling Twitter callback:', error);
    res.status(500).json({ error: 'Failed to link Twitter account' });
  }
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

module.exports = router; 