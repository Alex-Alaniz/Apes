const db = require('../database/db');
const { PublicKey, Transaction, SystemProgram } = require('@solana/web3.js');
const { Token, TOKEN_PROGRAM_ID } = require('@solana/spl-token');

class ReferralFeeService {
  // Platform fee configuration
  static PLATFORM_FEE_RATE = 100; // 1% in basis points
  static REFERRAL_SHARE_RATE = 0.20; // 20% of platform fees go to referrer
  
  /**
   * Calculate referral fee from a prediction
   * @param {number} wagerAmount - Amount wagered in APES
   * @returns {Object} Fee breakdown
   */
  static calculateReferralFee(wagerAmount) {
    // Platform takes 1% fee
    const platformFee = (wagerAmount * this.PLATFORM_FEE_RATE) / 10000;
    
    // Referrer gets 20% of platform fee
    const referralFee = platformFee * this.REFERRAL_SHARE_RATE;
    
    return {
      wagerAmount,
      platformFee,
      referralFee,
      netPlatformFee: platformFee - referralFee
    };
  }
  
  /**
   * Process referral fee when a prediction is made
   * @param {Object} predictionData - Prediction details
   */
  static async processReferralFee(predictionData) {
    const {
      userWallet,
      marketAddress,
      optionIndex,
      amount,
      transactionSignature,
      predictionId
    } = predictionData;
    
    try {
      // Check if user was referred
      const referralQuery = `
        SELECT r.referrer_wallet, r.is_active
        FROM referrals r
        WHERE r.referred_wallet = $1 AND r.is_active = true
        LIMIT 1
      `;
      
      const referralResult = await db.query(referralQuery, [userWallet]);
      
      if (referralResult.rows.length === 0) {
        // User was not referred, no referral fee
        return null;
      }
      
      const { referrer_wallet } = referralResult.rows[0];
      
      // Calculate fees
      const fees = this.calculateReferralFee(amount);
      
      // Record the referral transaction
      const insertQuery = `
        INSERT INTO referral_transactions (
          referrer_wallet,
          referred_wallet,
          prediction_id,
          market_address,
          wager_amount,
          fee_amount,
          referrer_share,
          referrer_percentage,
          transaction_signature,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        RETURNING id
      `;
      
      const result = await db.query(insertQuery, [
        referrer_wallet,
        userWallet,
        predictionId,
        marketAddress,
        amount,
        fees.platformFee,
        fees.referralFee,
        this.REFERRAL_SHARE_RATE,
        transactionSignature
      ]);
      
      // Update referral stats
      await this.updateReferralStats(referrer_wallet, amount, fees.referralFee);
      
      console.log(`💰 Referral fee processed: ${fees.referralFee} APES to ${referrer_wallet}`);
      
      return {
        transactionId: result.rows[0].id,
        referrerWallet: referrer_wallet,
        ...fees
      };
      
    } catch (error) {
      console.error('Error processing referral fee:', error);
      throw error;
    }
  }
  
  /**
   * Update referral statistics
   */
  static async updateReferralStats(referrerWallet, volumeAmount, rewardAmount) {
    try {
      const updateQuery = `
        INSERT INTO referral_stats (
          referrer_wallet,
          total_volume_generated,
          pending_rewards,
          last_updated
        ) VALUES ($1, $2, $3, NOW())
        ON CONFLICT (referrer_wallet) DO UPDATE SET
          total_volume_generated = referral_stats.total_volume_generated + $2,
          pending_rewards = referral_stats.pending_rewards + $3,
          last_updated = NOW()
      `;
      
      await db.query(updateQuery, [referrerWallet, volumeAmount, rewardAmount]);
    } catch (error) {
      console.error('Error updating referral stats:', error);
    }
  }
  
  /**
   * Get pending referral rewards for a wallet
   */
  static async getPendingRewards(walletAddress) {
    try {
      const query = `
        SELECT 
          COALESCE(pending_rewards, 0) as pending,
          COALESCE(total_rewards_earned, 0) as earned,
          COALESCE(total_volume_generated, 0) as volume
        FROM referral_stats
        WHERE referrer_wallet = $1
      `;
      
      const result = await db.query(query, [walletAddress]);
      
      if (result.rows.length === 0) {
        return { pending: 0, earned: 0, volume: 0 };
      }
      
      return {
        pending: parseFloat(result.rows[0].pending),
        earned: parseFloat(result.rows[0].earned),
        volume: parseFloat(result.rows[0].volume)
      };
    } catch (error) {
      console.error('Error getting pending rewards:', error);
      throw error;
    }
  }
  
  /**
   * Claim referral rewards (transfer from treasury to referrer)
   * NOTE: This is a placeholder - actual implementation needs treasury wallet integration
   */
  static async claimRewards(walletAddress, signature) {
    try {
      // Verify wallet ownership with signature
      // TODO: Implement signature verification
      
      // Get pending rewards
      const rewards = await this.getPendingRewards(walletAddress);
      
      if (rewards.pending <= 0) {
        throw new Error('No pending rewards to claim');
      }
      
      // TODO: Implement actual APES token transfer
      // This would involve:
      // 1. Connect to treasury wallet
      // 2. Create SPL token transfer transaction
      // 3. Sign and send transaction
      // 4. Wait for confirmation
      
      // For now, just update the database
      const updateQuery = `
        UPDATE referral_stats
        SET 
          pending_rewards = 0,
          total_rewards_earned = total_rewards_earned + pending_rewards,
          last_claimed_at = NOW()
        WHERE referrer_wallet = $1
        RETURNING pending_rewards
      `;
      
      const result = await db.query(updateQuery, [walletAddress]);
      
      return {
        claimed: parseFloat(result.rows[0].pending_rewards),
        transactionSignature: 'placeholder_' + Date.now() // TODO: Real transaction signature
      };
      
    } catch (error) {
      console.error('Error claiming rewards:', error);
      throw error;
    }
  }
  
  /**
   * Get referral leaderboard
   */
  static async getLeaderboard(limit = 10) {
    try {
      const query = `
        SELECT 
          rs.referrer_wallet,
          u.username,
          rs.total_referrals,
          rs.active_referrals,
          rs.total_volume_generated,
          rs.total_rewards_earned
        FROM referral_stats rs
        LEFT JOIN users u ON rs.referrer_wallet = u.wallet_address
        WHERE rs.total_referrals > 0
        ORDER BY rs.total_volume_generated DESC
        LIMIT $1
      `;
      
      const result = await db.query(query, [limit]);
      
      return result.rows.map((row, index) => ({
        rank: index + 1,
        wallet: `${row.referrer_wallet.slice(0, 4)}...${row.referrer_wallet.slice(-4)}`,
        username: row.username || 'Anonymous',
        referrals: parseInt(row.total_referrals),
        volume: parseFloat(row.total_volume_generated),
        earned: parseFloat(row.total_rewards_earned)
      }));
      
    } catch (error) {
      console.error('Error getting referral leaderboard:', error);
      throw error;
    }
  }
}

module.exports = ReferralFeeService;