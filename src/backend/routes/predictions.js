const express = require('express');
const router = express.Router();
const db = require('../config/database');
const engagementService = require('../services/engagementService');

// Record a new prediction
router.post('/place', async (req, res) => {
  console.log('🎯 PREDICTION PLACE endpoint called');
  console.log('🎯 Headers:', req.headers);
  console.log('🎯 Body:', req.body);
  
  try {
    const userAddress = req.headers['x-wallet-address'];
    if (!userAddress) {
      console.log('❌ No wallet address provided');
      return res.status(401).json({ error: 'No wallet address provided' });
    }

    const { 
      market_address, 
      option_index, 
      amount, 
      transaction_signature 
    } = req.body;

    console.log('🎯 Processing prediction:', { userAddress, market_address, option_index, amount });

    // Validate inputs
    if (!market_address || option_index === undefined || !amount) {
      console.log('❌ Missing required fields:', { market_address, option_index, amount });
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Insert prediction into database
    const insertQuery = `
      INSERT INTO predictions (
        user_address, 
        market_address, 
        option_index, 
        amount, 
        transaction_signature
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    console.log('🎯 Inserting prediction into database...');
    const result = await db.query(insertQuery, [
      userAddress,
      market_address,
      option_index,
      amount,
      transaction_signature
    ]);

    const prediction = result.rows[0];
    console.log('✅ Prediction inserted:', prediction);

    // Track engagement points for placing a prediction
    await engagementService.trackActivity(
      userAddress,
      'PLACE_PREDICTION',
      {
        market_address,
        option_index,
        amount,
        prediction_id: prediction.id
      }
    );

    console.log('✅ Engagement tracked for prediction');

    // Check for streaks
    await engagementService.checkStreaks(userAddress);

    console.log('✅ Streaks checked');

    res.json({
      success: true,
      prediction,
      message: 'Prediction placed successfully'
    });
  } catch (error) {
    console.error('❌ Error placing prediction:', error);
    res.status(500).json({ error: 'Failed to place prediction' });
  }
});

// Test endpoint to check database connectivity
router.get('/test', async (req, res) => {
  try {
    console.log('🧪 Testing predictions table...');
    const result = await db.query('SELECT COUNT(*) as count FROM predictions');
    console.log('🧪 Predictions count:', result.rows[0]);
    
    const marketsResult = await db.query('SELECT COUNT(*) as count FROM markets');
    console.log('🧪 Markets count:', marketsResult.rows[0]);
    
    res.json({
      success: true,
      predictions_count: result.rows[0].count,
      markets_count: marketsResult.rows[0].count,
      message: 'Database connectivity test passed'
    });
  } catch (error) {
    console.error('❌ Database test error:', error);
    res.status(500).json({ error: 'Database test failed', details: error.message });
  }
});

// Get user's predictions
router.get('/user/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const { market_address } = req.query;

    let query = `
      SELECT 
        p.*,
        m.question as market_question,
        m.options as market_options,
        m.status as market_status,
        m.resolved_option as winning_option
      FROM predictions p
      JOIN markets m ON p.market_address = m.market_address
      WHERE p.user_address = $1
    `;
    
    const params = [walletAddress];
    
    if (market_address) {
      query += ' AND p.market_address = $2';
      params.push(market_address);
    }
    
    query += ' ORDER BY p.created_at DESC';

    const result = await db.query(query, params);
    
    res.json({
      predictions: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching user predictions:', error);
    res.status(500).json({ error: 'Failed to fetch predictions' });
  }
});

// Claim rewards for winning prediction
router.post('/claim/:predictionId', async (req, res) => {
  try {
    const userAddress = req.headers['x-wallet-address'];
    if (!userAddress) {
      return res.status(401).json({ error: 'No wallet address provided' });
    }

    const { predictionId } = req.params;
    const { payout, transaction_signature } = req.body;

    // Verify the prediction belongs to the user and is eligible
    const checkQuery = `
      SELECT p.*, m.status, m.resolved_option
      FROM predictions p
      JOIN markets m ON p.market_address = m.market_address
      WHERE p.id = $1 AND p.user_address = $2
    `;

    const checkResult = await db.query(checkQuery, [predictionId, userAddress]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Prediction not found' });
    }

    const prediction = checkResult.rows[0];
    
    if (prediction.claimed) {
      return res.status(400).json({ error: 'Rewards already claimed' });
    }

    if (prediction.status !== 'Resolved') {
      return res.status(400).json({ error: 'Market not resolved yet' });
    }

    if (prediction.option_index !== prediction.resolved_option) {
      return res.status(400).json({ error: 'Not a winning prediction' });
    }

    // Update prediction as claimed
    const updateQuery = `
      UPDATE predictions
      SET 
        claimed = true,
        claim_timestamp = NOW(),
        payout = $1
      WHERE id = $2
      RETURNING *
    `;

    const updateResult = await db.query(updateQuery, [payout, predictionId]);

    // Track engagement points for winning
    await engagementService.trackActivity(
      userAddress,
      'WIN_PREDICTION',
      {
        prediction_id: predictionId,
        payout,
        market_address: prediction.market_address
      }
    );

    res.json({
      success: true,
      prediction: updateResult.rows[0],
      message: 'Rewards claimed successfully'
    });
  } catch (error) {
    console.error('Error claiming rewards:', error);
    res.status(500).json({ error: 'Failed to claim rewards' });
  }
});

// Get prediction statistics
router.get('/stats/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;

    const statsQuery = `
      SELECT 
        COUNT(*) as total_predictions,
        COUNT(CASE WHEN claimed = true THEN 1 END) as winning_predictions,
        COALESCE(SUM(amount), 0) as total_invested,
        COALESCE(SUM(CASE WHEN claimed = true THEN payout END), 0) as total_winnings,
        COALESCE(SUM(CASE WHEN claimed = true THEN payout - amount END), 0) as total_profit
      FROM predictions
      WHERE user_address = $1
    `;

    const result = await db.query(statsQuery, [walletAddress]);
    const stats = result.rows[0];

    // Calculate win rate
    const winRate = stats.total_predictions > 0 
      ? (stats.winning_predictions / stats.total_predictions * 100).toFixed(2)
      : 0;

    res.json({
      ...stats,
      win_rate: parseFloat(winRate)
    });
  } catch (error) {
    console.error('Error fetching prediction stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router; 