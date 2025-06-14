const express = require('express');
const router = express.Router();
const db = require('../config/database');
const engagementService = require('../services/engagementService');

// Create or get user
router.post('/create-or-get', async (req, res) => {
  const walletAddress = req.headers['x-wallet-address'];
  
  if (!walletAddress) {
    return res.status(401).json({ error: 'No wallet address provided' });
  }

  try {
    // Check if user exists
    let user = await db.query(
      'SELECT * FROM users WHERE wallet_address = $1',
      [walletAddress]
    );

    let isNewUser = false;
    if (user.rows.length === 0) {
      // Create new user
      user = await db.query(
        `INSERT INTO users (wallet_address) 
         VALUES ($1) 
         RETURNING *`,
        [walletAddress]
      );

      // Initialize user stats
      await db.query(
        `INSERT INTO user_stats (wallet_address) 
         VALUES ($1)
         ON CONFLICT (wallet_address) DO NOTHING`,
        [walletAddress]
      );
      
      isNewUser = true;
      
      // Award engagement points for connecting to dApp (first time only)
      try {
        await engagementService.trackActivity(
          walletAddress,
          'CONNECT_WALLET',
          {
            first_connection: true,
            timestamp: new Date().toISOString()
          }
        );
        console.log(`Awarded connection points to new user: ${walletAddress}`);
      } catch (engagementError) {
        // Don't fail user creation if engagement tracking fails
        console.error('Failed to award connection points:', engagementError);
      }
    }

    const userData = user.rows[0];
    
    res.json(userData);
  } catch (error) {
    console.error('Error creating/getting user:', error);
    res.status(500).json({ error: 'Failed to create/get user' });
  }
});

// Get user profile
router.get('/:walletAddress', async (req, res) => {
  const { walletAddress } = req.params;

  try {
    const user = await db.query(
      `SELECT u.*, us.*, 
              COUNT(DISTINCT ph.id) as total_bets_count,
              COUNT(DISTINCT CASE WHEN ph.is_winner = true THEN ph.id END) as won_bets_count
       FROM users u
       LEFT JOIN user_stats us ON u.wallet_address = us.wallet_address
       LEFT JOIN prediction_history ph ON u.wallet_address = ph.wallet_address
       WHERE u.wallet_address = $1
       GROUP BY u.wallet_address, us.wallet_address`,
      [walletAddress]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user.rows[0]);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Get public user profile (safe for public viewing)
router.get('/:walletAddress/profile', async (req, res) => {
  const { walletAddress } = req.params;

  try {
    const user = await db.query(
      `SELECT 
        wallet_address,
        username,
        twitter_username,
        twitter_id,
        created_at
       FROM users 
       WHERE wallet_address = $1`,
      [walletAddress]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user.rows[0]);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// Update user username
router.put('/:walletAddress/username', async (req, res) => {
  const { walletAddress } = req.params;
  const { username } = req.body;
  const requestingUser = req.headers['x-wallet-address'];

  // Verify the requesting user matches the wallet being updated
  if (requestingUser !== walletAddress) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  if (!username || username.length < 3 || username.length > 20) {
    return res.status(400).json({ error: 'Username must be 3-20 characters' });
  }

  try {
    // Check if username is already taken
    const existingUser = await db.query(
      'SELECT wallet_address FROM users WHERE username = $1 AND wallet_address != $2',
      [username, walletAddress]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    // Update username
    const result = await db.query(
      'UPDATE users SET username = $1, updated_at = CURRENT_TIMESTAMP WHERE wallet_address = $2 RETURNING *',
      [username, walletAddress]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Award engagement points for completing profile (if first time setting username)
    const user = result.rows[0];
    if (!user.username || user.username !== username) {
      try {
        await engagementService.trackActivity(
          walletAddress,
          'COMPLETE_PROFILE',
          {
            action: 'set_username',
            username: username
          }
        );
      } catch (engagementError) {
        console.error('Failed to award profile completion points:', engagementError);
      }
    }

    res.json(user);
  } catch (error) {
    console.error('Error updating username:', error);
    res.status(500).json({ error: 'Failed to update username' });
  }
});

// Get user stats
router.get('/:walletAddress/stats', async (req, res) => {
  const { walletAddress } = req.params;

  try {
    const stats = await db.query(
      `SELECT 
        COUNT(DISTINCT ph.id) as "totalBets",
        COUNT(DISTINCT CASE WHEN ph.is_winner = true THEN ph.id END) as "wonBets",
        COALESCE(SUM(ph.amount), 0) as "totalVolume",
        COALESCE(SUM(CASE WHEN ph.is_winner = true THEN ph.payout_amount - ph.amount ELSE -ph.amount END), 0) as "profit",
        CASE 
          WHEN COUNT(DISTINCT ph.id) > 0 
          THEN (COUNT(DISTINCT CASE WHEN ph.is_winner = true THEN ph.id END)::float / COUNT(DISTINCT ph.id)::float * 100)
          ELSE 0 
        END as "winRate"
       FROM prediction_history ph
       WHERE ph.wallet_address = $1`,
      [walletAddress]
    );

    // Ensure all values are numbers
    const result = {
      totalBets: parseInt(stats.rows[0].totalBets) || 0,
      wonBets: parseInt(stats.rows[0].wonBets) || 0,
      totalVolume: parseFloat(stats.rows[0].totalVolume) || 0,
      profit: parseFloat(stats.rows[0].profit) || 0,
      winRate: parseFloat(stats.rows[0].winRate) || 0
    };

    res.json(result);
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ error: 'Failed to fetch user stats' });
  }
});

// Get user betting history
router.get('/:walletAddress/bets', async (req, res) => {
  const { walletAddress } = req.params;
  const { limit = 20, offset = 0 } = req.query;

  try {
    const bets = await db.query(
      `SELECT 
        ph.*,
        mc.question as "marketTitle",
        mc.status as "marketStatus"
       FROM prediction_history ph
       LEFT JOIN markets_cache mc ON ph.market_pubkey = mc.market_pubkey
       WHERE ph.wallet_address = $1
       ORDER BY ph.predicted_at DESC
       LIMIT $2 OFFSET $3`,
      [walletAddress, limit, offset]
    );

    const formattedBets = bets.rows.map(bet => ({
      marketTitle: bet.marketTitle || bet.markettitle || bet.market_question,
      position: bet.option_text,
      amount: parseFloat(bet.amount),
      date: bet.predicted_at,
      status: bet.is_winner === true ? 'won' : bet.is_winner === false ? 'lost' : 'pending',
      marketPubkey: bet.market_pubkey,
      payoutAmount: bet.payout_amount ? parseFloat(bet.payout_amount) : null,
      claimed: bet.claimed
    }));

    res.json({ bets: formattedBets });
  } catch (error) {
    console.error('Error fetching betting history:', error);
    res.status(500).json({ error: 'Failed to fetch betting history' });
  }
});

// Link additional wallet to existing user
router.post('/:walletAddress/link-wallet', async (req, res) => {
  const { walletAddress } = req.params;
  const { newWalletAddress, username, twitterId } = req.body;
  const requestingWallet = req.headers['x-wallet-address'];

  if (requestingWallet !== walletAddress) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  try {
    // Verify the user has either a username or twitter linked
    const user = await db.query(
      'SELECT username, twitter_id FROM users WHERE wallet_address = $1',
      [walletAddress]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.rows[0].username && !user.rows[0].twitter_id) {
      return res.status(400).json({ error: 'Please set a username or link Twitter before linking additional wallets' });
    }

    // Check if new wallet already exists
    const existingWallet = await db.query(
      'SELECT wallet_address FROM users WHERE wallet_address = $1',
      [newWalletAddress]
    );

    if (existingWallet.rows.length > 0) {
      return res.status(409).json({ error: 'This wallet is already associated with another account' });
    }

    // Create linked wallet entry (you might want to create a separate table for this)
    // For now, we'll just note it in a comment
    // In production, you'd want a user_wallets table that links multiple wallets to a primary user ID

    res.json({ 
      message: 'Wallet linking feature coming soon',
      primaryWallet: walletAddress,
      newWallet: newWalletAddress 
    });
  } catch (error) {
    console.error('Error linking wallet:', error);
    res.status(500).json({ error: 'Failed to link wallet' });
  }
});

// Cleanup tourist wallets (admin endpoint)
router.post('/cleanup-tourists', async (req, res) => {
  const requestingUser = req.headers['x-wallet-address'];
  
  // Simple admin check - in production, this should be more robust
  const isAdmin = ['APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z'].includes(requestingUser);
  
  if (!isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    // Find tourist wallets (connected >30 days ago with no activity)
    const touristQuery = `
      WITH user_activity AS (
        SELECT 
          u.wallet_address,
          u.created_at,
          COUNT(DISTINCT p.id) as prediction_count,
          COALESCE(pb.total_points, 0) as engagement_points
        FROM users u
        LEFT JOIN predictions p ON u.wallet_address = p.user_address
        LEFT JOIN point_balances pb ON u.wallet_address = pb.user_address
        WHERE u.created_at < NOW() - INTERVAL '30 days'
        GROUP BY u.wallet_address, u.created_at, pb.total_points
        HAVING COUNT(DISTINCT p.id) = 0 AND COALESCE(pb.total_points, 0) = 0
      )
      SELECT wallet_address, created_at FROM user_activity
    `;

    const touristUsers = await db.query(touristQuery);
    
    if (touristUsers.rows.length === 0) {
      return res.json({
        message: 'No tourist wallets found for cleanup',
        cleaned: 0
      });
    }

    // Archive tourists to a separate table before deletion
    await db.query(`
      CREATE TABLE IF NOT EXISTS tourist_wallets (
        wallet_address VARCHAR(44) PRIMARY KEY,
        original_created_at TIMESTAMP,
        archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Move tourists to archive
    for (const tourist of touristUsers.rows) {
      await db.query(
        'INSERT INTO tourist_wallets (wallet_address, original_created_at) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [tourist.wallet_address, tourist.created_at]
      );
    }

    // Delete from main users table
    const walletAddresses = touristUsers.rows.map(u => u.wallet_address);
    await db.query(
      'DELETE FROM users WHERE wallet_address = ANY($1)',
      [walletAddresses]
    );

    res.json({
      message: `Cleaned up ${touristUsers.rows.length} tourist wallets`,
      cleaned: touristUsers.rows.length,
      archived_wallets: walletAddresses
    });

  } catch (error) {
    console.error('Error cleaning up tourists:', error);
    res.status(500).json({ error: 'Failed to cleanup tourist wallets' });
  }
});

module.exports = router; 