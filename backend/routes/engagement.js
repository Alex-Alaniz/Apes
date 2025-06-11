const express = require('express');
const router = express.Router();
const engagementService = require('../services/engagementService');

// Track engagement activity
router.post('/track', async (req, res) => {
  try {
    const userAddress = req.headers['x-wallet-address'];
    if (!userAddress) {
      return res.status(401).json({ error: 'No wallet address provided' });
    }

    const { activity_type, metadata } = req.body;
    
    if (!activity_type) {
      return res.status(400).json({ error: 'Activity type is required' });
    }

    const result = await engagementService.trackActivity(
      userAddress,
      activity_type,
      metadata
    );

    res.json({
      success: true,
      points_earned: result ? result.points_earned : 0,
      activity: result
    });
  } catch (error) {
    console.error('Error tracking engagement:', error);
    res.status(500).json({ error: 'Failed to track engagement' });
  }
});

// Award points directly
router.post('/award', async (req, res) => {
  try {
    const { userAddress, activityType, points, metadata } = req.body;
    
    if (!userAddress || !activityType || !points) {
      return res.status(400).json({ error: 'User address, activity type, and points are required' });
    }

    // Award points using the engagement service
    const result = await engagementService.awardPoints(
      userAddress,
      activityType,
      points,
      metadata
    );

    console.log(`✅ Awarded ${points} points to ${userAddress.substring(0, 8)}... for ${activityType}`);

    res.json({
      success: true,
      points_awarded: points,
      activity: result
    });
  } catch (error) {
    console.error('Error awarding points:', error);
    res.status(500).json({ error: 'Failed to award points' });
  }
});

// Get user's point balance
router.get('/balance/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    
    const balance = await engagementService.getBalance(walletAddress);
    
    res.json(balance);
  } catch (error) {
    console.error('Error getting balance:', error);
    res.status(500).json({ error: 'Failed to get balance' });
  }
});

// Get engagement leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const leaderboard = await engagementService.getEngagementLeaderboard(limit);
    
    res.json({
      leaderboard,
      total: leaderboard.length
    });
  } catch (error) {
    console.error('Error getting engagement leaderboard:', error);
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

// Check if user can claim airdrop
router.get('/can-claim', async (req, res) => {
  try {
    const userAddress = req.headers['x-wallet-address'];
    if (!userAddress) {
      return res.status(401).json({ error: 'No wallet address provided' });
    }

    const eligibility = await engagementService.canClaimAirdrop(userAddress);
    
    res.json(eligibility);
  } catch (error) {
    console.error('Error checking claim eligibility:', error);
    res.status(500).json({ error: 'Failed to check eligibility' });
  }
});

// Calculate APES amount for points
router.get('/calculate-apes/:points', async (req, res) => {
  try {
    const userAddress = req.headers['x-wallet-address'];
    if (!userAddress) {
      return res.status(401).json({ error: 'No wallet address provided' });
    }

    const points = parseInt(req.params.points);
    if (isNaN(points) || points <= 0) {
      return res.status(400).json({ error: 'Invalid points amount' });
    }

    const balance = await engagementService.getBalance(userAddress);
    const apesAmount = engagementService.calculateApesAmount(points, balance.multiplier);

    res.json({
      points,
      multiplier: balance.multiplier,
      tier: balance.tier,
      apes_amount: apesAmount
    });
  } catch (error) {
    console.error('Error calculating APES:', error);
    res.status(500).json({ error: 'Failed to calculate APES amount' });
  }
});

module.exports = router; 