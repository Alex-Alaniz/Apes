const express = require('express');
const router = express.Router();
const db = require('../config/database');
const ReferralFeeService = require('../services/referralFeeService');
const {
  authenticateWallet,
  authorizeWalletAccess,
  createReferralLimiter,
  statsReferralLimiter,
  sanitizeReferralInput,
  isValidSolanaAddress
} = require('../middleware/referralAuth');

// Process referral when new user signs up
// Protected endpoint - requires authentication
router.post('/process', 
  authenticateWallet, 
  createReferralLimiter, 
  sanitizeReferralInput, 
  async (req, res) => {
  try {
    const { referralCode, referredWallet, sourcePlatform = 'web' } = req.body;
    
    if (!referralCode || !referredWallet) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields' 
      });
    }
    
    // Verify the authenticated wallet matches the referred wallet
    if (req.wallet !== referredWallet) {
      return res.status(403).json({ 
        success: false, 
        error: 'You can only create referrals for your own wallet' 
      });
    }
    
    // referralCode is actually the referrer's wallet address
    const referrerWallet = referralCode;
    
    console.log('🎯 Processing referral:', { referrerWallet, referredWallet, sourcePlatform });
    
    // Verify referrer exists
    const referrerQuery = `
      SELECT wallet_address 
      FROM users 
      WHERE wallet_address = $1
    `;
    const referrerResult = await db.query(referrerQuery, [referrerWallet]);
    
    if (referrerResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Referrer wallet not found' 
      });
    }
    
    // Don't allow self-referral
    if (referrerWallet === referredWallet) {
      return res.status(400).json({ 
        success: false, 
        error: 'Self-referral not allowed' 
      });
    }
    
    // Check if referral already exists
    const existingQuery = `
      SELECT id FROM referrals 
      WHERE referred_wallet = $1
    `;
    const existingResult = await db.query(existingQuery, [referredWallet]);
    
    if (existingResult.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'User already has a referrer' 
      });
    }
    
    // Create referral record
    const insertQuery = `
      INSERT INTO referrals (
        referrer_wallet, 
        referred_wallet, 
        referral_code, 
        source_platform,
        is_active,
        referred_at
      ) VALUES ($1, $2, $3, $4, true, NOW())
      RETURNING id
    `;
    
    await db.query(insertQuery, [
      referrerWallet,
      referredWallet,
      referrerWallet, // Using wallet as the referral identifier
      sourcePlatform
    ]);
    
    // Update referrer stats
    const updateStatsQuery = `
      INSERT INTO referral_stats (
        referrer_wallet,
        total_referrals,
        active_referrals,
        last_updated
      ) VALUES ($1, 1, 1, NOW())
      ON CONFLICT (referrer_wallet) DO UPDATE SET
        total_referrals = referral_stats.total_referrals + 1,
        active_referrals = referral_stats.active_referrals + 1,
        last_updated = NOW()
    `;
    
    await db.query(updateStatsQuery, [referrerWallet]);
    
    // Update user record with referral info
    const updateUserQuery = `
      UPDATE users 
      SET 
        referred_by = $1,
        referral_source = $2,
        updated_at = NOW()
      WHERE wallet_address = $3
    `;
    
    await db.query(updateUserQuery, [referrerWallet, sourcePlatform, referredWallet]);
    
    console.log('✅ Referral processed successfully');
    
    res.json({ 
      success: true, 
      message: 'Referral processed successfully' 
    });
    
  } catch (error) {
    console.error('Error processing referral:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to process referral' 
    });
  }
});

// Get referral stats for a user
// Protected endpoint - users can only see their own stats
router.get('/stats/:walletAddress', 
  authenticateWallet,
  authorizeWalletAccess,
  statsReferralLimiter,
  async (req, res) => {
  try {
    const { walletAddress } = req.params;
    
    // Get user info
    const userQuery = `
      SELECT username 
      FROM users 
      WHERE wallet_address = $1
    `;
    const userResult = await db.query(userQuery, [walletAddress]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const { username } = userResult.rows[0];
    const referral_code = walletAddress; // Wallet IS the referral code
    
    // Get referral stats
    const statsQuery = `
      SELECT 
        COALESCE(total_referrals, 0) as total_referrals,
        COALESCE(active_referrals, 0) as active_referrals,
        COALESCE(total_volume_generated, 0) as total_volume_generated,
        COALESCE(total_rewards_earned, 0) as total_rewards_earned,
        COALESCE(pending_rewards, 0) as pending_rewards
      FROM referral_stats
      WHERE referrer_wallet = $1
    `;
    const statsResult = await db.query(statsQuery, [walletAddress]);
    
    const stats = statsResult.rows[0] || {
      total_referrals: 0,
      active_referrals: 0,
      total_volume_generated: 0,
      total_rewards_earned: 0,
      pending_rewards: 0
    };
    
    res.json({
      referralCode: walletAddress, // Using wallet as referral identifier
      username: username,
      totalReferrals: parseInt(stats.total_referrals),
      activeReferrals: parseInt(stats.active_referrals),
      totalVolumeGenerated: parseFloat(stats.total_volume_generated),
      totalRewardsEarned: parseFloat(stats.total_rewards_earned),
      pendingRewards: parseFloat(stats.pending_rewards)
    });
    
  } catch (error) {
    console.error('Error fetching referral stats:', error);
    res.status(500).json({ error: 'Failed to fetch referral stats' });
  }
});

// Get list of referred users
// Protected endpoint - users can only see their own referrals
router.get('/users/:walletAddress', 
  authenticateWallet,
  authorizeWalletAccess,
  statsReferralLimiter,
  async (req, res) => {
  try {
    const { walletAddress } = req.params;
    
    const query = `
      SELECT 
        r.referred_wallet,
        r.referred_at,
        r.is_active,
        u.username,
        u.total_predictions,
        u.total_wagered
      FROM referrals r
      LEFT JOIN users u ON r.referred_wallet = u.wallet_address
      WHERE r.referrer_wallet = $1
      ORDER BY r.referred_at DESC
    `;
    
    const result = await db.query(query, [walletAddress]);
    
    // Don't expose full wallet addresses for privacy
    res.json(result.rows.map(row => ({
      walletAddress: `${row.referred_wallet.slice(0, 4)}...${row.referred_wallet.slice(-4)}`, // Truncated for privacy
      username: row.username,
      referredAt: row.referred_at,
      isActive: row.is_active,
      totalPredictions: parseInt(row.total_predictions || 0),
      totalWagered: parseFloat(row.total_wagered || 0)
    })));
    
  } catch (error) {
    console.error('Error fetching referred users:', error);
    res.status(500).json({ error: 'Failed to fetch referred users' });
  }
});

// Get pending rewards for a wallet
// Protected endpoint
router.get('/rewards/:walletAddress',
  authenticateWallet,
  authorizeWalletAccess,
  statsReferralLimiter,
  async (req, res) => {
    try {
      const { walletAddress } = req.params;
      const rewards = await ReferralFeeService.getPendingRewards(walletAddress);
      res.json(rewards);
    } catch (error) {
      console.error('Error fetching rewards:', error);
      res.status(500).json({ error: 'Failed to fetch rewards' });
    }
  }
);

// Claim referral rewards
// Protected endpoint with strict rate limiting
router.post('/claim',
  authenticateWallet,
  createReferralLimiter, // Reuse the strict limiter
  async (req, res) => {
    try {
      const walletAddress = req.wallet;
      const { signature } = req.body;
      
      if (!signature) {
        return res.status(400).json({ error: 'Transaction signature required' });
      }
      
      const result = await ReferralFeeService.claimRewards(walletAddress, signature);
      res.json({
        success: true,
        claimed: result.claimed,
        transactionSignature: result.transactionSignature
      });
      
    } catch (error) {
      console.error('Error claiming rewards:', error);
      res.status(500).json({ 
        error: error.message || 'Failed to claim rewards' 
      });
    }
  }
);

// Get referral leaderboard
// Public endpoint with rate limiting
router.get('/leaderboard',
  statsReferralLimiter,
  async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit) || 10, 50); // Max 50
      const leaderboard = await ReferralFeeService.getLeaderboard(limit);
      res.json(leaderboard);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
  }
);

module.exports = router;