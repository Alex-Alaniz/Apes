const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const engagementService = require('../services/engagementService');

// Create or get user endpoint
router.post('/create-or-get', async (req, res) => {
  const walletAddress = req.headers['x-wallet-address'];
  
  if (!walletAddress) {
    return res.status(400).json({ error: 'Wallet address required in x-wallet-address header' });
  }

  try {
    console.log('🔄 Creating/getting user for wallet:', walletAddress);
    
    // Check if user exists
    const { data: existingUser, error: selectError } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single();

    if (selectError && selectError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('❌ Error checking existing user:', selectError);
      return res.status(500).json({ error: 'Database query failed' });
    }

    if (existingUser) {
      console.log('✅ User found:', existingUser.wallet_address);
      return res.json(existingUser);
    }

    // Create new user
    const newUser = {
      wallet_address: walletAddress,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: createdUser, error: insertError } = await supabase
      .from('users')
      .insert(newUser)
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error creating user:', insertError);
      return res.status(500).json({ error: 'Failed to create user' });
    }

    console.log('✅ User created:', createdUser.wallet_address);

    // Award points for connecting wallet
    try {
      await engagementService.trackActivity(walletAddress, 'CONNECT_WALLET');
      console.log('🎯 Awarded 25 points for wallet connection');
    } catch (pointsError) {
      console.error('⚠️ Failed to award connection points:', pointsError.message);
      // Don't fail the request if points fail, just log it
    }

    res.json(createdUser);

  } catch (error) {
    console.error('❌ Error in create-or-get user:', error);
    res.status(500).json({ error: 'Failed to create/get user' });
  }
});

// Get user stats
router.get('/stats/:walletAddress', async (req, res) => {
  const { walletAddress } = req.params;

  try {
    const { data: stats, error } = await supabase
      .from('user_stats')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('❌ Error fetching user stats:', error);
      return res.status(500).json({ error: 'Failed to fetch user stats' });
    }

    res.json(stats || {
      wallet_address: walletAddress,
      total_predictions: 0,
      correct_predictions: 0,
      total_volume: 0,
      total_points: 0
    });

  } catch (error) {
    console.error('❌ Error fetching user stats:', error);
    res.status(500).json({ error: 'Failed to fetch user stats' });
  }
});

// **NEW: Refresh user data endpoint to fix display issues**
router.post('/refresh/:walletAddress', async (req, res) => {
  const { walletAddress } = req.params;

  try {
    console.log('🔄 Refreshing user data for:', walletAddress);

    // Force update point balance
    await engagementService.updatePointBalance(walletAddress);

    // Get refreshed user balance
    const balance = await engagementService.getBalance(walletAddress);

    // Get updated leaderboard position
    const { data: allBalances, error: rankError } = await supabase
      .from('point_balances')
      .select('user_address, total_points')
      .order('total_points', { ascending: false });

    let rank = null;
    if (!rankError && allBalances) {
      rank = allBalances.findIndex(b => b.user_address === walletAddress) + 1;
      if (rank === 0) rank = null;
    }

    console.log('✅ User data refreshed successfully for:', walletAddress);

    res.json({
      success: true,
      message: 'User data refreshed successfully',
      data: {
        ...balance,
        rank: rank,
        refreshed_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error refreshing user data:', error);
    res.status(500).json({ error: 'Failed to refresh user data' });
  }
});

// Update username endpoint
router.put('/update-username', async (req, res) => {
  const walletAddress = req.headers['x-wallet-address'];
  const { username } = req.body;

  if (!walletAddress) {
    return res.status(400).json({ error: 'Wallet address required in x-wallet-address header' });
  }

  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  if (username.length > 50) {
    return res.status(400).json({ error: 'Username must be 50 characters or less' });
  }

  try {
    console.log('🔄 Updating username for wallet:', walletAddress, 'to:', username);

    // Check if username is already taken by another user
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('wallet_address')
      .eq('username', username)
      .neq('wallet_address', walletAddress)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Error checking username availability:', checkError);
      return res.status(500).json({ error: 'Failed to check username availability' });
    }

    if (existingUser) {
      return res.status(400).json({ error: 'Username is already taken' });
    }

    // Update username
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ 
        username: username, 
        updated_at: new Date().toISOString() 
      })
      .eq('wallet_address', walletAddress)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error updating username:', updateError);
      return res.status(500).json({ error: 'Failed to update username' });
    }

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('✅ Username updated successfully for:', walletAddress);
    res.json(updatedUser);

  } catch (error) {
    console.error('❌ Error in update username:', error);
    res.status(500).json({ error: 'Failed to update username' });
  }
});

module.exports = router; 