const express = require('express');
const router = express.Router();
const db = require('../config/database');

// List of authorized admin wallets (same as in admin.js)
const AUTHORIZED_WALLETS = [
  'APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z', // PRIMAPE Treasury
  'APESxbwPNyJW62vSY83zENJwoL2gXJ8HbpXfkBGfnghe', // Community Treasury
  'XgkAtCrgMcz63WBm6LR1uqEKDDJM4q6tLxRH7Dg6nSe', // New admin wallet
];

// Check if wallet is authorized
const isWalletAuthorized = (walletAddress) => {
  return AUTHORIZED_WALLETS.includes(walletAddress);
};

// Tournament entry endpoint
router.post('/:tournamentId/join', async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const { userAddress } = req.body;

    if (!userAddress) {
      return res.status(400).json({ error: 'User address is required' });
    }

    // Check if user is already in tournament
    const existingEntry = await db.query(
      'SELECT * FROM tournament_participants WHERE tournament_id = $1 AND user_address = $2',
      [tournamentId, userAddress]
    );

    if (existingEntry.rows.length > 0) {
      return res.json({ message: 'Already participating in tournament', participating: true });
    }

    // Add user to tournament
    await db.query(
      'INSERT INTO tournament_participants (tournament_id, user_address, joined_at) VALUES ($1, $2, NOW())',
      [tournamentId, userAddress]
    );

    console.log(`✅ User ${userAddress.substring(0, 8)}... joined tournament ${tournamentId}`);
    res.json({ message: 'Successfully joined tournament', participating: true });

  } catch (error) {
    console.error('Error joining tournament:', error);
    res.status(500).json({ error: 'Failed to join tournament' });
  }
});

// Get tournament leaderboard
router.get('/:tournamentId/leaderboard', async (req, res) => {
  try {
    const { tournamentId } = req.params;

    // Get tournament participants with their performance
    const query = `
      WITH tournament_predictions AS (
        SELECT 
          p.user_address,
          COUNT(*) as total_predictions,
          COUNT(CASE WHEN p.claimed = true THEN 1 END) as winning_predictions,
          SUM(p.amount) as total_invested,
          SUM(CASE 
            WHEN p.claimed = true THEN (p.payout - p.amount)
            WHEN p.claimed = false AND m.status = 'Resolved' AND m.resolved_option != p.option_index THEN -p.amount
            ELSE 0 
          END) as total_profit
        FROM predictions p
        JOIN markets m ON p.market_address = m.market_address
        WHERE m.tournament_id = $1
        GROUP BY p.user_address
      ),
      tournament_stats AS (
        SELECT 
          tp.user_address,
          u.username,
          u.twitter_username,
          COALESCE(tpred.total_predictions, 0) as total_predictions,
          COALESCE(tpred.winning_predictions, 0) as winning_predictions,
          COALESCE(tpred.total_invested, 0) as total_invested,
          COALESCE(tpred.total_profit, 0) as total_profit,
          CASE 
            WHEN COALESCE(tpred.total_predictions, 0) > 0 
            THEN (COALESCE(tpred.winning_predictions, 0)::DECIMAL / tpred.total_predictions) * 100
            ELSE 0 
          END as accuracy_rate,
          tp.joined_at
        FROM tournament_participants tp
        LEFT JOIN users u ON tp.user_address = u.wallet_address
        LEFT JOIN tournament_predictions tpred ON tp.user_address = tpred.user_address
      )
      SELECT *,
        ROW_NUMBER() OVER (ORDER BY total_profit DESC, accuracy_rate DESC, total_predictions DESC) as rank
      FROM tournament_stats
      ORDER BY rank
      LIMIT 100
    `;

    const result = await db.query(query, [tournamentId]);

    // Calculate tournament-specific metrics
    const leaderboard = result.rows.map(row => ({
      ...row,
      total_predictions: parseInt(row.total_predictions) || 0,
      winning_predictions: parseInt(row.winning_predictions) || 0,
      total_invested: parseFloat(row.total_invested) || 0,
      total_profit: parseFloat(row.total_profit) || 0,
      accuracy_rate: parseFloat(row.accuracy_rate) || 0,
      rank: parseInt(row.rank)
    }));

    console.log(`📊 Tournament ${tournamentId} leaderboard: ${leaderboard.length} participants`);
    res.json({ leaderboard, totalParticipants: leaderboard.length });

  } catch (error) {
    console.error('Error fetching tournament leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch tournament leaderboard' });
  }
});

// Get tournament participant status
router.get('/:tournamentId/status/:userAddress', async (req, res) => {
  try {
    const { tournamentId, userAddress } = req.params;

    const result = await db.query(
      'SELECT * FROM tournament_participants WHERE tournament_id = $1 AND user_address = $2',
      [tournamentId, userAddress]
    );

    const participating = result.rows.length > 0;
    
    if (participating) {
      // Get user's tournament rank and stats
      const statsQuery = `
        WITH tournament_predictions AS (
          SELECT 
            p.user_address,
            COUNT(*) as total_predictions,
            COUNT(CASE WHEN p.claimed = true THEN 1 END) as winning_predictions,
            SUM(CASE 
              WHEN p.claimed = true THEN (p.payout - p.amount)
              WHEN p.claimed = false AND m.status = 'Resolved' AND m.resolved_option != p.option_index THEN -p.amount
              ELSE 0 
            END) as total_profit
          FROM predictions p
          JOIN markets m ON p.market_address = m.market_address
          WHERE m.tournament_id = $1 AND p.user_address = $2
          GROUP BY p.user_address
        )
        SELECT 
          COALESCE(tp.total_predictions, 0) as total_predictions,
          COALESCE(tp.winning_predictions, 0) as winning_predictions,
          COALESCE(tp.total_profit, 0) as total_profit,
          CASE 
            WHEN COALESCE(tp.total_predictions, 0) > 0 
            THEN (COALESCE(tp.winning_predictions, 0)::DECIMAL / tp.total_predictions) * 100
            ELSE 0 
          END as accuracy_rate
        FROM tournament_predictions tp
      `;
      
      const statsResult = await db.query(statsQuery, [tournamentId, userAddress]);
      const stats = statsResult.rows[0] || {
        total_predictions: 0,
        winning_predictions: 0,
        total_profit: 0,
        accuracy_rate: 0
      };

      res.json({ 
        participating: true, 
        joinedAt: result.rows[0].joined_at,
        stats: {
          total_predictions: parseInt(stats.total_predictions) || 0,
          winning_predictions: parseInt(stats.winning_predictions) || 0,
          total_profit: parseFloat(stats.total_profit) || 0,
          accuracy_rate: parseFloat(stats.accuracy_rate) || 0
        }
      });
    } else {
      res.json({ participating: false });
    }

  } catch (error) {
    console.error('Error checking tournament status:', error);
    res.status(500).json({ error: 'Failed to check tournament status' });
  }
});

// Get tournament markets
router.get('/:tournamentId/markets', async (req, res) => {
  try {
    const { tournamentId } = req.params;

    const query = `
      SELECT *
      FROM markets 
      WHERE tournament_id = $1
      ORDER BY created_at ASC
    `;

    const result = await db.query(query, [tournamentId]);
    
    console.log(`📊 Found ${result.rows.length} markets for tournament ${tournamentId}`);
    res.json(result.rows);

  } catch (error) {
    console.error('Error fetching tournament markets:', error);
    res.status(500).json({ error: 'Failed to fetch tournament markets' });
  }
});

// Get tournament details including assets
router.get('/:tournamentId/details', async (req, res) => {
  try {
    const { tournamentId } = req.params;

    const query = `
      SELECT 
        tournament_id,
        name,
        description,
        category,
        start_date,
        end_date,
        prize_pool,
        max_participants,
        status,
        assets,
        team_logos,
        match_banners,
        created_at,
        updated_at
      FROM tournaments 
      WHERE tournament_id = $1
    `;

    const result = await db.query(query, [tournamentId]);
    
    if (result.rows.length === 0) {
      // If tournament doesn't exist in database, create it with defaults
      if (tournamentId === 'club-world-cup-2025') {
        await db.query(`
          INSERT INTO tournaments (
            tournament_id, name, description, category, 
            start_date, end_date, prize_pool, max_participants, status
          ) VALUES (
            $1, 'FIFA Club World Cup 2025', 
            'Predict winners of the FIFA Club World Cup 2025 matches',
            'Football', '2025-06-14', '2025-07-13', 50000, 10000, 'upcoming'
          ) ON CONFLICT (tournament_id) DO NOTHING
        `, [tournamentId]);
        
        // Fetch again
        const newResult = await db.query(query, [tournamentId]);
        if (newResult.rows.length > 0) {
          res.json(newResult.rows[0]);
          return;
        }
      }
      
      return res.status(404).json({ error: 'Tournament not found' });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Error fetching tournament details:', error);
    res.status(500).json({ error: 'Failed to fetch tournament details' });
  }
});

// Update tournament assets (admin only)
router.put('/:tournamentId/assets', async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const { assets, team_logos, match_banners } = req.body;
    const walletAddress = req.headers['x-wallet-address'];

    // Check if user is authorized admin
    if (!walletAddress || !isWalletAuthorized(walletAddress)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Update tournament assets
    const query = `
      UPDATE tournaments 
      SET 
        assets = COALESCE($1, assets),
        team_logos = COALESCE($2, team_logos),
        match_banners = COALESCE($3, match_banners),
        updated_at = NOW()
      WHERE tournament_id = $4
      RETURNING *
    `;

    const result = await db.query(query, [
      assets || null,
      team_logos || null,
      match_banners || null,
      tournamentId
    ]);

    if (result.rows.length === 0) {
      // Tournament doesn't exist, create it first
      await db.query(`
        INSERT INTO tournaments (
          tournament_id, name, assets, team_logos, match_banners
        ) VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (tournament_id) DO UPDATE
        SET 
          assets = EXCLUDED.assets,
          team_logos = EXCLUDED.team_logos,
          match_banners = EXCLUDED.match_banners,
          updated_at = NOW()
      `, [
        tournamentId,
        tournamentId,
        assets || {},
        team_logos || {},
        match_banners || {}
      ]);

      const newResult = await db.query('SELECT * FROM tournaments WHERE tournament_id = $1', [tournamentId]);
      console.log(`✅ Tournament ${tournamentId} assets saved by ${walletAddress.substring(0, 8)}...`);
      res.json(newResult.rows[0]);
    } else {
      console.log(`✅ Tournament ${tournamentId} assets updated by ${walletAddress.substring(0, 8)}...`);
      res.json(result.rows[0]);
    }

  } catch (error) {
    console.error('Error updating tournament assets:', error);
    res.status(500).json({ error: 'Failed to update tournament assets' });
  }
});

module.exports = router; 