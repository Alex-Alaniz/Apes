const express = require('express');
const router = express.Router();
const db = require('../config/database');
const engagementService = require('../services/engagementService');

// EMERGENCY MINIMAL ROUTE - Test if routing works at all
router.get('/emergency', async (req, res) => {
  res.json({
    success: true,
    message: 'EMERGENCY ROUTE WORKS - predictions routing is functional',
    timestamp: new Date().toISOString()
  });
});

// CRITICAL MINIMAL PREDICTION ENDPOINT - No dependencies, just save to DB
router.post('/place', async (req, res) => {
  console.log('🚨 MINIMAL PREDICTION PLACE endpoint called');
  console.log('🚨 Headers:', req.headers);
  console.log('🚨 Body:', req.body);
  
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

    console.log('🚨 Processing prediction:', { userAddress, market_address, option_index, amount });

    // Validate inputs
    if (!market_address || option_index === undefined || !amount) {
      console.log('❌ Missing required fields:', { market_address, option_index, amount });
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // STEP 1: Ensure user exists (no foreign key crashes)
    try {
      await db.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS total_invested NUMERIC(20, 6) DEFAULT 0
      `);
      
      await db.query(`
        INSERT INTO users (wallet_address, total_invested)
        VALUES ($1, 0)
        ON CONFLICT (wallet_address) DO NOTHING
      `, [userAddress]);
      
      console.log('✅ User ensured in database');
    } catch (userError) {
      console.log('⚠️ User setup warning:', userError.message);
    }

    // STEP 2: Insert prediction
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

    console.log('🚨 Inserting prediction into database...');
    const result = await db.query(insertQuery, [
      userAddress,
      market_address,
      option_index,
      amount,
      transaction_signature
    ]);

    const prediction = result.rows[0];
    console.log('✅ Prediction inserted:', prediction);

    // STEP 3: Update total_invested
    try {
      await db.query(`
        UPDATE users 
        SET total_invested = COALESCE(total_invested, 0) + $1
        WHERE wallet_address = $2
      `, [amount, userAddress]);
      
      console.log(`✅ Updated total_invested for ${userAddress} by ${amount}`);
    } catch (updateError) {
      console.log('⚠️ Could not update total_invested:', updateError.message);
    }

    console.log('🚨 MINIMAL PREDICTION SUCCESSFUL - NO ENGAGEMENT SERVICE CALLS');

    res.json({
      success: true,
      prediction,
      message: 'Prediction placed successfully (minimal version)'
    });
  } catch (error) {
    console.error('❌ Error placing prediction:', error);
    res.status(500).json({ error: 'Failed to place prediction', details: error.message });
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

// Simple debug endpoint to test database connection
router.get('/debug', async (req, res) => {
  try {
    console.log('🔍 PREDICTIONS DEBUG: Testing database connection...');
    
    // CRITICAL: Ensure total_invested column exists
    try {
      await db.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS total_invested NUMERIC(20, 6) DEFAULT 0
      `);
      console.log('✅ total_invested column ensured');
    } catch (columnError) {
      console.log('⚠️ Column setup warning:', columnError.message);
    }
    
    // Test basic database connection
    const dbTest = await db.query('SELECT NOW() as current_time');
    console.log('🔍 Database connection works:', dbTest.rows[0]);
    
    // Count predictions
    const countResult = await db.query('SELECT COUNT(*) as total FROM predictions');
    console.log('🔍 Predictions count:', countResult.rows[0].total);
    
    // Get sample predictions
    const sampleResult = await db.query('SELECT * FROM predictions LIMIT 3');
    console.log('🔍 Sample predictions:', sampleResult.rows);
    
    res.json({
      success: true,
      database_connected: true,
      current_time: dbTest.rows[0].current_time,
      predictions_count: countResult.rows[0].total,
      sample_predictions: sampleResult.rows,
      message: 'Predictions route debug successful'
    });
  } catch (error) {
    console.error('🔍 PREDICTIONS DEBUG ERROR:', error);
    res.status(500).json({ 
      success: false,
      error: 'Predictions debug failed', 
      details: error.message 
    });
  }
});

module.exports = router; 