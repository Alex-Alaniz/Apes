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
      await engagementService.awardPoints(walletAddress, 'CONNECT_WALLET', 25);
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

module.exports = router; 