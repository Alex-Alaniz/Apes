const express = require('express');
const router = express.Router();
const db = require('../config/database');

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

module.exports = router; 