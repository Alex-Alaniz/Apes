const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const engagementService = require('../services/engagementService');

// Generate Twitter OAuth link (simplified version)
router.post('/auth/link', async (req, res) => {
  try {
    const userAddress = req.headers['x-wallet-address'];
    if (!userAddress) {
      return res.status(401).json({ error: 'No wallet address provided' });
    }

    // For now, return a simple auth URL (Twitter OAuth can be implemented later)
    const authUrl = `https://twitter.com/oauth/authorize?oauth_token=placeholder`;
    
    res.json({
      auth_url: authUrl,
      message: 'Twitter OAuth not fully implemented yet. Use debug endpoint for testing.'
    });
  } catch (error) {
    console.error('Error generating Twitter auth link:', error);
    res.status(500).json({ error: 'Failed to generate auth link' });
  }
});

// Handle OAuth callback (simplified)
router.post('/auth/callback', async (req, res) => {
  try {
    const userAddress = req.headers['x-wallet-address'];
    if (!userAddress) {
      return res.status(401).json({ error: 'No wallet address provided' });
    }

    res.status(501).json({ 
      error: 'Twitter OAuth callback not fully implemented yet. Use debug endpoint for testing.' 
    });
  } catch (error) {
    console.error('Error handling Twitter callback:', error);
    res.status(500).json({ error: 'Failed to link Twitter account' });
  }
});

// Debug endpoint to manually link Twitter (for testing)
router.post('/auth/debug-link', async (req, res) => {
  try {
    const { walletAddress, twitterId, username } = req.body;
    
    if (!walletAddress || !twitterId || !username) {
      return res.status(400).json({ error: 'Missing required fields: walletAddress, twitterId, username' });
    }
    
    console.log('🔗 Debug Twitter link attempt:', { walletAddress, twitterId, username });
    
    // Check if this Twitter account already exists
    const { data: existingTwitter, error: twitterCheckError } = await supabase
      .from('twitter_accounts')
      .select('twitter_id')
      .eq('twitter_id', twitterId)
      .single();
    
    if (twitterCheckError && twitterCheckError.code !== 'PGRST116') {
      console.error('Error checking existing Twitter account:', twitterCheckError);
      return res.status(500).json({ error: 'Database error checking Twitter account' });
    }

    const isNewTwitterAccount = !existingTwitter;

    // Create Twitter account if it doesn't exist
    if (isNewTwitterAccount) {
      const { error: createTwitterError } = await supabase
        .from('twitter_accounts')
        .insert({
          twitter_id: twitterId,
          twitter_username: username,
          twitter_followers: 0
        });
      
      if (createTwitterError) {
        console.error('Error creating Twitter account:', createTwitterError);
        return res.status(500).json({ error: 'Failed to create Twitter account' });
      }
      
      console.log('✅ Created new Twitter account:', twitterId);
    }

    // Check if wallet is already linked to a different Twitter account
    const { data: existingLink, error: linkCheckError } = await supabase
      .from('wallet_twitter_links')
      .select('twitter_id')
      .eq('wallet_address', walletAddress)
      .single();
    
    if (linkCheckError && linkCheckError.code !== 'PGRST116') {
      console.error('Error checking existing wallet link:', linkCheckError);
      return res.status(500).json({ error: 'Database error checking wallet link' });
    }

    if (existingLink && existingLink.twitter_id !== twitterId) {
      return res.status(409).json({ 
        error: 'This wallet is already linked to a different Twitter account' 
      });
    }

    // Create user if needed
    const { error: userCreateError } = await supabase
      .from('users')
      .upsert({
        wallet_address: walletAddress,
        twitter_id: twitterId,
        twitter_username: username,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'wallet_address'
      });
    
    if (userCreateError) {
      console.error('Error creating/updating user:', userCreateError);
      return res.status(500).json({ error: 'Failed to create/update user' });
    }

    // Check if this is the first wallet for this Twitter account
    const { data: walletCount, error: countError } = await supabase
      .from('wallet_twitter_links')
      .select('*', { count: 'exact' })
      .eq('twitter_id', twitterId);
    
    if (countError) {
      console.error('Error counting wallets for Twitter:', countError);
      return res.status(500).json({ error: 'Database error' });
    }

    const isFirstWallet = walletCount.length === 0;

    // Create wallet-Twitter link
    const { error: linkCreateError } = await supabase
      .from('wallet_twitter_links')
      .upsert({
        wallet_address: walletAddress,
        twitter_id: twitterId,
        is_primary_wallet: isFirstWallet,
        linked_at: new Date().toISOString()
      }, {
        onConflict: 'wallet_address,twitter_id'
      });
    
    if (linkCreateError) {
      console.error('Error creating wallet-Twitter link:', linkCreateError);
      return res.status(500).json({ error: 'Failed to create Twitter link' });
    }

    // Award points for linking Twitter
    try {
      await engagementService.trackActivity(walletAddress, 'LINK_TWITTER');
      console.log('🎯 Awarded 100 points for Twitter linking');
    } catch (pointsError) {
      console.error('⚠️ Failed to award Twitter linking points:', pointsError.message);
      // Don't fail the request if points fail
    }

    console.log('✅ Twitter link successful for:', walletAddress);

    res.json({
      success: true,
      message: 'Twitter account linked successfully',
      twitter_id: twitterId,
      twitter_username: username,
      is_new_twitter_account: isNewTwitterAccount,
      is_primary_wallet: isFirstWallet
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