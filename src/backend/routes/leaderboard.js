const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Helper function to calculate user rank
const calculateRank = (predictions, winRate) => {
  if (predictions >= 50 && winRate >= 70) return 'Master';
  if (predictions >= 30 && winRate >= 60) return 'Expert';
  if (predictions >= 20 && winRate >= 50) return 'Advanced';
  if (predictions >= 10) return 'Intermediate';
  return 'Beginner';
};

// Helper function to convert database values to numbers
const convertToNumbers = (user) => ({
  ...user,
  total_predictions: Number(user.total_predictions) || 0,
  total_invested: Number(user.total_invested) || 0,
  winning_predictions: Number(user.winning_predictions) || 0,
  total_profit: Number(user.total_profit) || 0,
  win_rate: Number(user.win_rate) || 0,
  engagement_points: Number(user.engagement_points) || 0,
  available_points: Number(user.available_points) || 0,
  profit_rank: Number(user.profit_rank) || null,
  accuracy_rank: Number(user.accuracy_rank) || null,
  volume_rank: Number(user.volume_rank) || null,
  airdrop_eligible: Boolean(user.airdrop_eligible),
  activity_status: user.activity_status || 'new',
  connected_at: user.connected_at
});

// Get main leaderboard - FIXED VERSION (bypasses broken JOINs)
router.get('/', async (req, res) => {
  try {
    const { sortBy = 'profit', timeframe = 'all' } = req.query;
    
    console.log(`🚨 FIXED: Direct leaderboard query bypassing JOINs...`);
    
              // Step 1: Get ALL predictions data directly (handle amount data type issues)
     const predictionsQuery = `
       SELECT 
         user_address,
         COUNT(*) as total_predictions,
                  COALESCE(SUM(CAST(amount AS NUMERIC)), 0) as total_invested,
         COUNT(CASE WHEN claimed = true THEN 1 END) as winning_predictions,
         COALESCE(SUM(CASE 
           WHEN claimed = true AND payout > 0 THEN (CAST(payout AS NUMERIC) - CAST(amount AS NUMERIC))
           ELSE 0 
         END), 0) as total_profit,
         MAX(created_at) as last_prediction
       FROM predictions 
       WHERE amount IS NOT NULL
       GROUP BY user_address
     `;
    
    console.log(`🚨 Executing predictions query...`);
    const predictionsResult = await db.query(predictionsQuery);
    console.log(`🚨 Found ${predictionsResult.rows.length} users with predictions`);
    
    // Step 2: Get engagement points
    const engagementQuery = `
      SELECT 
        user_address,
        total_points as engagement_points,
        available_points
      FROM point_balances
    `;
    
    const engagementResult = await db.query(engagementQuery);
    console.log(`🚨 Found ${engagementResult.rows.length} users with engagement`);
    
    // Step 3: Get user profile data
    const usersQuery = `
      SELECT 
        wallet_address,
        username,
        twitter_username,
        created_at
      FROM users
    `;
    
    const usersResult = await db.query(usersQuery);
    console.log(`🚨 Found ${usersResult.rows.length} total users`);
    
    // Step 4: Build leaderboard manually
    const userMap = new Map();
    
    // Add all predictions data first (this is the critical data)
    predictionsResult.rows.forEach(pred => {
      const totalPredictions = parseInt(pred.total_predictions) || 0;
      const totalInvested = parseFloat(pred.total_invested) || 0;
      const winningPredictions = parseInt(pred.winning_predictions) || 0;
      const totalProfit = parseFloat(pred.total_profit) || 0;
      const winRate = totalPredictions > 0 ? (winningPredictions / totalPredictions) * 100 : 0;
      
      userMap.set(pred.user_address, {
        wallet_address: pred.user_address,
        username: null,
        twitter_username: null,
        connected_at: pred.last_prediction,
        total_predictions: totalPredictions,
        total_invested: totalInvested,
        winning_predictions: winningPredictions,
        total_profit: totalProfit,
        win_rate: winRate,
        engagement_points: 0,
        available_points: 0,
        airdrop_eligible: true, // Has predictions
        activity_status: 'active'
      });
    });
    
    // Add users data
    usersResult.rows.forEach(user => {
      if (userMap.has(user.wallet_address)) {
        // User has predictions - update profile info
        const userData = userMap.get(user.wallet_address);
        userData.username = user.username;
        userData.twitter_username = user.twitter_username;
        userData.connected_at = user.created_at;
      } else {
        // User has no predictions - create entry
        userMap.set(user.wallet_address, {
          wallet_address: user.wallet_address,
          username: user.username,
          twitter_username: user.twitter_username,
          connected_at: user.created_at,
          total_predictions: 0,
          total_invested: 0,
          winning_predictions: 0,
          total_profit: 0,
          win_rate: 0,
          engagement_points: 0,
          available_points: 0,
          airdrop_eligible: false,
          activity_status: 'new'
        });
      }
    });
    
    // Add engagement data
    engagementResult.rows.forEach(eng => {
      if (userMap.has(eng.user_address)) {
        const userData = userMap.get(eng.user_address);
        userData.engagement_points = parseInt(eng.engagement_points) || 0;
        userData.available_points = parseInt(eng.available_points) || 0;
        if (userData.activity_status === 'new' && userData.engagement_points > 0) {
          userData.activity_status = 'active';
        }
      }
    });
    
    // Convert to array and sort
    const leaderboard = Array.from(userMap.values())
      .filter(user => user.total_invested > 0 || user.engagement_points > 0 || user.total_predictions > 0)
      .sort((a, b) => {
        switch (sortBy) {
          case 'volume': return b.total_invested - a.total_invested;
          case 'profit': return b.total_profit - a.total_profit;
          case 'accuracy': return b.win_rate - a.win_rate;
          case 'engagement': return b.engagement_points - a.engagement_points;
          default: return b.total_profit - a.total_profit;
        }
      })
      .map((user, index) => ({
        ...user,
        position: index + 1,
        rank: calculateRank(user.total_predictions, user.win_rate)
      }));
    
    console.log(`🚨 Built leaderboard with ${leaderboard.length} users`);
    if (leaderboard.length > 0) {
      const topUser = leaderboard[0];
      console.log(`🚨 Top user: ${topUser.wallet_address.substring(0, 8)}... - ${topUser.total_invested} APES invested, ${topUser.total_predictions} predictions`);
    }
    
    res.json({ leaderboard });
  } catch (error) {
    console.error('🚨 FIXED leaderboard error:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// Get top performers
router.get('/top-performers', async (req, res) => {
  try {
    const topProfitQuery = `
      WITH user_stats AS (
        SELECT 
          u.wallet_address,
          u.username,
          u.twitter_username,
          COUNT(DISTINCT p.id) as total_predictions,
          COALESCE(SUM(p.amount), 0) as total_invested,
          COUNT(DISTINCT CASE WHEN p.claimed = true THEN p.id END) as winning_predictions,
          COALESCE(SUM(CASE 
            WHEN p.claimed = true THEN (p.payout - p.amount)
            WHEN p.claimed = false AND m.status = 'Resolved' AND m.resolved_option != p.option_index THEN -p.amount
            ELSE 0 
          END), 0) as total_profit,
          CASE 
            WHEN COUNT(DISTINCT p.id) > 0 
            THEN (COUNT(DISTINCT CASE WHEN p.claimed = true THEN p.id END)::DECIMAL / COUNT(DISTINCT p.id)) * 100
            ELSE 0 
          END as win_rate,
          COALESCE(MAX(pb.total_points), 0) as engagement_points,
          COALESCE(MAX(pb.available_points), 0) as available_points,
          CASE WHEN COUNT(DISTINCT p.id) > 0 THEN true ELSE false END as airdrop_eligible
        FROM users u
        LEFT JOIN predictions p ON TRIM(u.wallet_address) = TRIM(p.user_address)
        LEFT JOIN markets m ON TRIM(p.market_address) = TRIM(m.market_address)
        LEFT JOIN point_balances pb ON TRIM(u.wallet_address) = TRIM(pb.user_address)
        GROUP BY u.wallet_address, u.username, u.twitter_username
        HAVING COUNT(DISTINCT p.id) >= 1 OR COALESCE(MAX(pb.total_points), 0) > 0
      )
      SELECT *
      FROM user_stats
      ORDER BY total_profit DESC
      LIMIT 3
    `;

    const topAccuracyQuery = `
      WITH user_stats AS (
        SELECT 
          u.wallet_address,
          u.username,
          u.twitter_username,
          COUNT(DISTINCT p.id) as total_predictions,
          COALESCE(SUM(p.amount), 0) as total_invested,
          COUNT(DISTINCT CASE WHEN p.claimed = true THEN p.id END) as winning_predictions,
          COALESCE(SUM(CASE 
            WHEN p.claimed = true THEN (p.payout - p.amount)
            WHEN p.claimed = false AND m.status = 'Resolved' AND m.resolved_option != p.option_index THEN -p.amount
            ELSE 0 
          END), 0) as total_profit,
          CASE 
            WHEN COUNT(DISTINCT p.id) > 0 
            THEN (COUNT(DISTINCT CASE WHEN p.claimed = true THEN p.id END)::DECIMAL / COUNT(DISTINCT p.id)) * 100
            ELSE 0 
          END as win_rate,
          COALESCE(MAX(pb.total_points), 0) as engagement_points,
          COALESCE(MAX(pb.available_points), 0) as available_points,
          CASE WHEN COUNT(DISTINCT p.id) > 0 THEN true ELSE false END as airdrop_eligible
        FROM users u
        LEFT JOIN predictions p ON TRIM(u.wallet_address) = TRIM(p.user_address)
        LEFT JOIN markets m ON TRIM(p.market_address) = TRIM(m.market_address)
        LEFT JOIN point_balances pb ON TRIM(u.wallet_address) = TRIM(pb.user_address)
        GROUP BY u.wallet_address, u.username, u.twitter_username
        HAVING COUNT(DISTINCT p.id) >= 5  -- Keep minimum 5 predictions for accuracy ranking
      )
      SELECT *
      FROM user_stats
      ORDER BY win_rate DESC
      LIMIT 3
    `;

    const topVolumeQuery = `
      WITH user_stats AS (
        SELECT 
          u.wallet_address,
          u.username,
          u.twitter_username,
          COUNT(DISTINCT p.id) as total_predictions,
          COALESCE(SUM(p.amount), 0) as total_invested,
          COUNT(DISTINCT CASE WHEN p.claimed = true THEN p.id END) as winning_predictions,
          COALESCE(SUM(CASE 
            WHEN p.claimed = true THEN (p.payout - p.amount)
            WHEN p.claimed = false AND m.status = 'Resolved' AND m.resolved_option != p.option_index THEN -p.amount
            ELSE 0 
          END), 0) as total_profit,
          CASE 
            WHEN COUNT(DISTINCT p.id) > 0 
            THEN (COUNT(DISTINCT CASE WHEN p.claimed = true THEN p.id END)::DECIMAL / COUNT(DISTINCT p.id)) * 100
            ELSE 0 
          END as win_rate,
          COALESCE(MAX(pb.total_points), 0) as engagement_points,
          COALESCE(MAX(pb.available_points), 0) as available_points,
          CASE WHEN COUNT(DISTINCT p.id) > 0 THEN true ELSE false END as airdrop_eligible
        FROM users u
        LEFT JOIN predictions p ON TRIM(u.wallet_address) = TRIM(p.user_address)
        LEFT JOIN markets m ON TRIM(p.market_address) = TRIM(m.market_address)
        LEFT JOIN point_balances pb ON TRIM(u.wallet_address) = TRIM(pb.user_address)
        GROUP BY u.wallet_address, u.username, u.twitter_username
        HAVING COUNT(DISTINCT p.id) >= 1 OR COALESCE(MAX(pb.total_points), 0) > 0
      )
      SELECT *
      FROM user_stats
      ORDER BY total_invested DESC
      LIMIT 3
    `;

    // Add top engagement query
    const topEngagementQuery = `
      WITH user_stats AS (
        SELECT 
          u.wallet_address,
          u.username,
          u.twitter_username,
          COUNT(DISTINCT p.id) as total_predictions,
          COALESCE(SUM(p.amount), 0) as total_invested,
          COUNT(DISTINCT CASE WHEN p.claimed = true THEN p.id END) as winning_predictions,
          COALESCE(SUM(CASE 
            WHEN p.claimed = true THEN (p.payout - p.amount)
            WHEN p.claimed = false AND m.status = 'Resolved' AND m.resolved_option != p.option_index THEN -p.amount
            ELSE 0 
          END), 0) as total_profit,
          CASE 
            WHEN COUNT(DISTINCT p.id) > 0 
            THEN (COUNT(DISTINCT CASE WHEN p.claimed = true THEN p.id END)::DECIMAL / COUNT(DISTINCT p.id)) * 100
            ELSE 0 
          END as win_rate,
          COALESCE(MAX(pb.total_points), 0) as engagement_points,
          COALESCE(MAX(pb.available_points), 0) as available_points,
          CASE WHEN COUNT(DISTINCT p.id) > 0 THEN true ELSE false END as airdrop_eligible
        FROM users u
        LEFT JOIN predictions p ON TRIM(u.wallet_address) = TRIM(p.user_address)
        LEFT JOIN markets m ON TRIM(p.market_address) = TRIM(m.market_address)
        LEFT JOIN point_balances pb ON TRIM(u.wallet_address) = TRIM(pb.user_address)
        GROUP BY u.wallet_address, u.username, u.twitter_username
        HAVING COALESCE(MAX(pb.total_points), 0) > 0  -- Must have engagement points
      )
      SELECT *
      FROM user_stats
      ORDER BY engagement_points DESC
      LIMIT 3
    `;

    console.log('🔄 Loading top performers...');
    const [topProfitResult, topAccuracyResult, topVolumeResult, topEngagementResult] = await Promise.all([
      db.query(topProfitQuery),
      db.query(topAccuracyQuery),
      db.query(topVolumeQuery),
      db.query(topEngagementQuery)
    ]);

    console.log(`📊 Top performers: Profit(${topProfitResult.rows.length}), Accuracy(${topAccuracyResult.rows.length}), Volume(${topVolumeResult.rows.length}), Engagement(${topEngagementResult.rows.length})`);

    const topPerformers = {
      topProfit: topProfitResult.rows.map(user => convertToNumbers({
        ...user,
        rank: calculateRank(user.total_predictions, user.win_rate)
      })),
      topAccuracy: topAccuracyResult.rows.map(user => convertToNumbers({
        ...user,
        rank: calculateRank(user.total_predictions, user.win_rate)
      })),
      topVolume: topVolumeResult.rows.map(user => convertToNumbers({
        ...user,
        rank: calculateRank(user.total_predictions, user.win_rate)
      })),
      topEngagement: topEngagementResult.rows.map(user => convertToNumbers({
        ...user,
        rank: calculateRank(user.total_predictions, user.win_rate)
      }))
    };

    // Always return database results (empty arrays if no data)
    res.json(topPerformers);
  } catch (error) {
    console.error('Error fetching top performers:', error);
    res.status(500).json({ error: 'Failed to fetch top performers' });
  }
});

// Get user rank
router.get('/rank/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    
    // Get real user rank from database including engagement points using predictions
    const query = `
      WITH user_stats AS (
        SELECT 
          u.wallet_address,
          COUNT(DISTINCT p.id) as total_predictions,
          COALESCE(SUM(p.amount), 0) as total_invested,
          COALESCE(SUM(CASE 
            WHEN p.claimed = true THEN (p.payout - p.amount)
            WHEN p.claimed = false AND m.status = 'Resolved' AND m.resolved_option != p.option_index THEN -p.amount
            ELSE 0 
          END), 0) as total_profit,
          CASE 
            WHEN COUNT(DISTINCT p.id) > 0 
            THEN (COUNT(DISTINCT CASE WHEN p.claimed = true THEN p.id END)::DECIMAL / COUNT(DISTINCT p.id)) * 100
            ELSE 0 
          END as win_rate,
          COALESCE(MAX(pb.total_points), 0) as engagement_points,
          COALESCE(MAX(pb.available_points), 0) as available_points,
          CASE WHEN COUNT(DISTINCT p.id) > 0 THEN true ELSE false END as airdrop_eligible
        FROM users u
        LEFT JOIN predictions p ON TRIM(u.wallet_address) = TRIM(p.user_address)
        LEFT JOIN markets m ON TRIM(p.market_address) = TRIM(m.market_address)
        LEFT JOIN point_balances pb ON TRIM(u.wallet_address) = TRIM(pb.user_address)
        WHERE TRIM(u.wallet_address) = TRIM($1)
        GROUP BY u.wallet_address
      ),
      profit_ranks AS (
        SELECT 
          wallet_address,
          ROW_NUMBER() OVER (ORDER BY total_profit DESC) as profit_rank
        FROM (
          SELECT 
            u.wallet_address,
            COALESCE(SUM(CASE 
              WHEN p.claimed = true THEN (p.payout - p.amount)
              WHEN p.claimed = false AND m.status = 'Resolved' AND m.resolved_option != p.option_index THEN -p.amount
              ELSE 0 
            END), 0) as total_profit
          FROM users u
          LEFT JOIN predictions p ON TRIM(u.wallet_address) = TRIM(p.user_address)
          LEFT JOIN markets m ON TRIM(p.market_address) = TRIM(m.market_address)
          LEFT JOIN point_balances pb ON TRIM(u.wallet_address) = TRIM(pb.user_address)
          GROUP BY u.wallet_address
          HAVING COUNT(DISTINCT p.id) >= 1 OR COALESCE(MAX(pb.total_points), 0) > 0
        ) ranked_users
      ),
      accuracy_ranks AS (
        SELECT 
          wallet_address,
          ROW_NUMBER() OVER (ORDER BY win_rate DESC) as accuracy_rank
        FROM (
          SELECT 
            u.wallet_address,
            CASE 
              WHEN COUNT(DISTINCT p.id) > 0 
              THEN (COUNT(DISTINCT CASE WHEN p.claimed = true THEN p.id END)::DECIMAL / COUNT(DISTINCT p.id)) * 100
              ELSE 0 
            END as win_rate
          FROM users u
          LEFT JOIN predictions p ON TRIM(u.wallet_address) = TRIM(p.user_address)
          LEFT JOIN markets m ON TRIM(p.market_address) = TRIM(m.market_address)
          LEFT JOIN point_balances pb ON TRIM(u.wallet_address) = TRIM(pb.user_address)
          GROUP BY u.wallet_address
          HAVING COUNT(DISTINCT p.id) >= 1 OR COALESCE(MAX(pb.total_points), 0) > 0
        ) ranked_users
      ),
      volume_ranks AS (
        SELECT 
          wallet_address,
          ROW_NUMBER() OVER (ORDER BY total_invested DESC) as volume_rank
        FROM (
          SELECT 
            u.wallet_address,
            COALESCE(SUM(p.amount), 0) as total_invested
          FROM users u
          LEFT JOIN predictions p ON TRIM(u.wallet_address) = TRIM(p.user_address)
          LEFT JOIN markets m ON TRIM(p.market_address) = TRIM(m.market_address)
          LEFT JOIN point_balances pb ON TRIM(u.wallet_address) = TRIM(pb.user_address)
          GROUP BY u.wallet_address
          HAVING COUNT(DISTINCT p.id) >= 1 OR COALESCE(MAX(pb.total_points), 0) > 0
        ) ranked_users
      ),
      engagement_ranks AS (
        SELECT 
          wallet_address,
          ROW_NUMBER() OVER (ORDER BY engagement_points DESC) as engagement_rank
        FROM (
          SELECT 
            u.wallet_address,
            COALESCE(MAX(pb.total_points), 0) as engagement_points
          FROM users u
          LEFT JOIN point_balances pb ON TRIM(u.wallet_address) = TRIM(pb.user_address)
          GROUP BY u.wallet_address
          HAVING COALESCE(MAX(pb.total_points), 0) > 0
        ) ranked_users
      )
      SELECT 
        us.*,
        pr.profit_rank,
        ar.accuracy_rank,
        vr.volume_rank,
        er.engagement_rank
      FROM user_stats us
      LEFT JOIN profit_ranks pr ON TRIM(us.wallet_address) = TRIM(pr.wallet_address)
      LEFT JOIN accuracy_ranks ar ON TRIM(us.wallet_address) = TRIM(ar.wallet_address)
      LEFT JOIN volume_ranks vr ON TRIM(us.wallet_address) = TRIM(vr.wallet_address)
      LEFT JOIN engagement_ranks er ON TRIM(us.wallet_address) = TRIM(er.wallet_address)
    `;
    
    const result = await db.query(query, [walletAddress]);
    
    if (result.rows.length === 0) {
      // Return empty/default data for non-existent users
      return res.json({ 
        userRank: {
          wallet_address: walletAddress,
          total_predictions: 0,
          total_invested: 0,
          total_profit: 0,
          win_rate: 0,
          engagement_points: 0,
          available_points: 0,
          airdrop_eligible: false,
          profit_rank: null,
          accuracy_rank: null,
          volume_rank: null,
          engagement_rank: null
        }
      });
    }
    
    // Convert to numbers for safe frontend usage
    const userRank = convertToNumbers(result.rows[0]);
    
    res.json({ userRank });
  } catch (error) {
    console.error('Error fetching user rank:', error);
    res.status(500).json({ error: 'Failed to fetch user rank' });
  }
});

// Debug endpoint to check specific wallet data
router.get('/debug/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    
    console.log(`🔍 DEBUG: Checking wallet ${walletAddress}`);
    
    // Check if user exists
    const userCheck = await db.query(
      'SELECT * FROM users WHERE wallet_address = $1',
      [walletAddress]
    );
    
    // Check predictions
    const predictionsCheck = await db.query(
      'SELECT * FROM predictions WHERE user_address = $1',
      [walletAddress]
    );
    
    // Check if there are any similar wallet addresses
    const similarCheck = await db.query(
      'SELECT DISTINCT user_address FROM predictions WHERE user_address LIKE $1',
      [`%${walletAddress.slice(-8)}%`]
    );
    
    // Check markets table for this creator
    const marketsCheck = await db.query(
      'SELECT * FROM markets WHERE creator = $1',
      [walletAddress]
    );
    
    // Check point balances
    const pointsCheck = await db.query(
      'SELECT * FROM point_balances WHERE user_address = $1',
      [walletAddress]
    );
    
    res.json({
      wallet_address: walletAddress,
      user_exists: userCheck.rows.length > 0,
      user_data: userCheck.rows[0] || null,
      predictions_count: predictionsCheck.rows.length,
      predictions: predictionsCheck.rows,
      similar_addresses: similarCheck.rows,
      markets_created: marketsCheck.rows.length,
      markets: marketsCheck.rows,
      points_data: pointsCheck.rows[0] || null,
      debug_info: {
        checked_at: new Date().toISOString(),
        similar_count: similarCheck.rows.length
      }
    });
  } catch (error) {
    console.error('Error in debug endpoint:', error);
    res.status(500).json({ error: 'Failed to debug wallet data' });
  }
});

// Debug endpoint to check predictions data
router.get('/debug-predictions', async (req, res) => {
  try {
    console.log('🔍 DEBUG: Checking predictions table...');
    
    // Check total predictions count
    const totalPredictionsQuery = 'SELECT COUNT(*) as count FROM predictions';
    const totalResult = await db.query(totalPredictionsQuery);
    
    // Check sample predictions with amounts
    const samplePredictionsQuery = `
      SELECT 
        user_address,
        market_address,
        amount,
        option_index,
        created_at
      FROM predictions 
      ORDER BY created_at DESC 
      LIMIT 10
    `;
    const sampleResult = await db.query(samplePredictionsQuery);
    
    // Check aggregated amounts by user
    const userAggregateQuery = `
      SELECT 
        user_address,
        COUNT(*) as prediction_count,
        SUM(amount) as total_amount
      FROM predictions 
      GROUP BY user_address
      ORDER BY total_amount DESC
      LIMIT 10
    `;
    const aggregateResult = await db.query(userAggregateQuery);
    
    // Check if users exist for these addresses
    const userCheckQuery = `
      SELECT 
        u.wallet_address,
        u.username,
        COUNT(p.id) as predictions_count,
        SUM(p.amount) as total_invested
      FROM users u
      LEFT JOIN predictions p ON u.wallet_address = p.user_address
      GROUP BY u.wallet_address, u.username
      HAVING COUNT(p.id) > 0
      ORDER BY total_invested DESC
      LIMIT 10
    `;
    const userCheckResult = await db.query(userCheckQuery);
    
    res.json({
      total_predictions: totalResult.rows[0].count,
      sample_predictions: sampleResult.rows,
      user_aggregates: aggregateResult.rows,
      users_with_predictions: userCheckResult.rows,
      debug_info: {
        checked_at: new Date().toISOString(),
        note: "If users_with_predictions is empty, predictions user_address doesn't match users wallet_address"
      }
    });
  } catch (error) {
    console.error('Error in predictions debug endpoint:', error);
    res.status(500).json({ error: 'Failed to debug predictions data' });
  }
});

// Simple test endpoint to verify predictions table access
router.get('/test-predictions', async (req, res) => {
  try {
    console.log('🧪 TEST: Direct predictions table query...');
    
    // Simple direct query to predictions table
    const directQuery = `
      SELECT 
        user_address,
        SUM(amount) as total_amount,
        COUNT(*) as prediction_count
      FROM predictions 
      GROUP BY user_address
      ORDER BY total_amount DESC
      LIMIT 5
    `;
    
    const directResult = await db.query(directQuery);
    console.log(`🧪 Direct predictions query returned ${directResult.rows.length} results`);
    
    if (directResult.rows.length > 0) {
      console.log('🧪 Top prediction amounts:');
      directResult.rows.forEach((row, index) => {
        console.log(`  ${index + 1}. ${row.user_address} - ${row.total_amount} APES (${row.prediction_count} predictions)`);
      });
    }
    
    // Test users table
    const usersQuery = `SELECT COUNT(*) as count FROM users`;
    const usersResult = await db.query(usersQuery);
    console.log(`🧪 Users table has ${usersResult.rows[0].count} users`);
    
    // Test simple JOIN
    const joinTestQuery = `
      SELECT 
        u.wallet_address,
        p.user_address,
        COUNT(p.id) as predictions,
        SUM(p.amount) as total_invested
      FROM users u
      LEFT JOIN predictions p ON u.wallet_address = p.user_address
      GROUP BY u.wallet_address, p.user_address
      HAVING COUNT(p.id) > 0
      LIMIT 5
    `;
    
    const joinResult = await db.query(joinTestQuery);
    console.log(`🧪 JOIN test returned ${joinResult.rows.length} results`);
    
    res.json({
      predictions_direct: directResult.rows,
      users_count: usersResult.rows[0].count,
      join_test: joinResult.rows,
      debug_info: {
        message: "Direct test of predictions table and JOIN",
        predictions_found: directResult.rows.length > 0,
        join_working: joinResult.rows.length > 0
      }
    });
  } catch (error) {
    console.error('🧪 TEST ERROR:', error);
    res.status(500).json({ error: 'Test failed', details: error.message });
  }
});

// Direct predictions data endpoint (bypassing JOIN issues)
router.get('/predictions-data', async (req, res) => {
  try {
    console.log('🧪 DIRECT: Fetching predictions data without complex JOINs...');
    
    // Get predictions data grouped by user_address
    const predictionsQuery = `
      SELECT 
        user_address as wallet_address,
        COUNT(*) as total_predictions,
        SUM(amount) as total_invested,
        COUNT(CASE WHEN claimed = true THEN 1 END) as winning_predictions,
        SUM(CASE 
          WHEN claimed = true AND payout > 0 THEN (payout - amount)
          ELSE 0 
        END) as total_profit
      FROM predictions 
      GROUP BY user_address
      ORDER BY total_invested DESC
    `;
    
    const predictionsResult = await db.query(predictionsQuery);
    console.log(`🧪 Found ${predictionsResult.rows.length} users with predictions`);
    
    // Get engagement points data
    const engagementQuery = `
      SELECT 
        user_address as wallet_address,
        total_points as engagement_points,
        available_points
      FROM point_balances
    `;
    
    const engagementResult = await db.query(engagementQuery);
    console.log(`🧪 Found ${engagementResult.rows.length} users with engagement points`);
    
    // Get user info (usernames, etc.)
    const usersQuery = `
      SELECT 
        wallet_address,
        username,
        twitter_username,
        created_at
      FROM users
    `;
    
    const usersResult = await db.query(usersQuery);
    console.log(`🧪 Found ${usersResult.rows.length} total users`);
    
    // Merge all data manually
    const userMap = new Map();
    
    // Add users first
    usersResult.rows.forEach(user => {
      userMap.set(user.wallet_address, {
        wallet_address: user.wallet_address,
        username: user.username,
        twitter_username: user.twitter_username,
        connected_at: user.created_at,
        total_predictions: 0,
        total_invested: 0,
        winning_predictions: 0,
        total_profit: 0,
        win_rate: 0,
        engagement_points: 0,
        available_points: 0,
        airdrop_eligible: false,
        activity_status: 'new'
      });
    });
    
    // Add predictions data
    predictionsResult.rows.forEach(pred => {
      if (userMap.has(pred.wallet_address)) {
        const user = userMap.get(pred.wallet_address);
        user.total_predictions = parseInt(pred.total_predictions) || 0;
        user.total_invested = parseFloat(pred.total_invested) || 0;
        user.winning_predictions = parseInt(pred.winning_predictions) || 0;
        user.total_profit = parseFloat(pred.total_profit) || 0;
        user.win_rate = user.total_predictions > 0 ? (user.winning_predictions / user.total_predictions) * 100 : 0;
        user.airdrop_eligible = user.total_predictions > 0;
        user.activity_status = 'active';
      } else {
        // User exists in predictions but not in users table - create entry
        const newUser = {
          wallet_address: pred.wallet_address,
          username: null,
          twitter_username: null,
          connected_at: new Date().toISOString(),
          total_predictions: parseInt(pred.total_predictions) || 0,
          total_invested: parseFloat(pred.total_invested) || 0,
          winning_predictions: parseInt(pred.winning_predictions) || 0,
          total_profit: parseFloat(pred.total_profit) || 0,
          win_rate: 0,
          engagement_points: 0,
          available_points: 0,
          airdrop_eligible: true,
          activity_status: 'active'
        };
        newUser.win_rate = newUser.total_predictions > 0 ? (newUser.winning_predictions / newUser.total_predictions) * 100 : 0;
        userMap.set(pred.wallet_address, newUser);
      }
    });
    
    // Add engagement data
    engagementResult.rows.forEach(eng => {
      if (userMap.has(eng.wallet_address)) {
        const user = userMap.get(eng.wallet_address);
        user.engagement_points = parseInt(eng.engagement_points) || 0;
        user.available_points = parseInt(eng.available_points) || 0;
        if (user.activity_status === 'new' && user.engagement_points > 0) {
          user.activity_status = 'active';
        }
      }
    });
    
    // Convert to array and sort by total invested
    const leaderboard = Array.from(userMap.values())
      .filter(user => user.total_invested > 0 || user.engagement_points > 0)
      .sort((a, b) => b.total_invested - a.total_invested)
      .map((user, index) => ({
        ...user,
        position: index + 1,
        rank: calculateRank(user.total_predictions, user.win_rate)
      }));
    
    console.log(`🧪 Generated leaderboard with ${leaderboard.length} active users`);
    if (leaderboard.length > 0) {
      console.log(`🧪 Top user: ${leaderboard[0].wallet_address.substring(0, 8)}... - ${leaderboard[0].total_invested} APES`);
    }
    
    res.json({ leaderboard });
  } catch (error) {
    console.error('🧪 DIRECT ERROR:', error);
    res.status(500).json({ error: 'Failed to fetch predictions data' });
  }
});

// Critical debug endpoint - check predictions table directly
router.get('/debug-critical', async (req, res) => {
  try {
    console.log('🚨 CRITICAL DEBUG: Checking predictions table...');
    
    // Count total predictions
    const countQuery = 'SELECT COUNT(*) as total FROM predictions';
    const countResult = await db.query(countQuery);
    
    // Get sample predictions
    const sampleQuery = `
      SELECT 
        id,
        user_address,
        market_address,
        amount,
        option_index,
        created_at
      FROM predictions 
      ORDER BY created_at DESC 
      LIMIT 10
    `;
    const sampleResult = await db.query(sampleQuery);
    
    // Check users table 
    const usersQuery = `
      SELECT wallet_address, username, created_at 
      FROM users 
      ORDER BY created_at DESC 
      LIMIT 10
    `;
    const usersResult = await db.query(usersQuery);
    
    // Test direct JOIN
    const joinQuery = `
      SELECT 
        u.wallet_address,
        p.user_address,
        COUNT(p.id) as prediction_count,
        SUM(p.amount) as total_amount
      FROM users u
      INNER JOIN predictions p ON u.wallet_address = p.user_address
      GROUP BY u.wallet_address, p.user_address
      LIMIT 5
    `;
    const joinResult = await db.query(joinQuery);
    
    console.log(`🚨 Predictions: ${countResult.rows[0].total}`);
    console.log(`🚨 Users: ${usersResult.rows.length}`);
    console.log(`🚨 JOIN results: ${joinResult.rows.length}`);
    
    res.json({
      status: 'CRITICAL DEBUG',
      predictions: {
        total: countResult.rows[0].total,
        sample: sampleResult.rows
      },
      users: {
        sample: usersResult.rows
      },
      join_test: {
        working: joinResult.rows.length > 0,
        results: joinResult.rows
      },
      diagnosis: {
        predictions_exist: parseInt(countResult.rows[0].total) > 0,
        users_exist: usersResult.rows.length > 0,
        join_working: joinResult.rows.length > 0,
        likely_issue: joinResult.rows.length === 0 ? 'JOIN_MISMATCH' : 'OTHER'
      }
    });
  } catch (error) {
    console.error('🚨 CRITICAL DEBUG ERROR:', error);
    res.status(500).json({ error: 'Critical debug failed', details: error.message });
  }
});

// Debug predictions amount column specifically
router.get('/debug-amounts', async (req, res) => {
  try {
    console.log('🔍 AMOUNT DEBUG: Checking predictions amount column...');
    
    // Check amount column data types and values
    const amountCheckQuery = `
      SELECT 
        user_address,
        amount,
        pg_typeof(amount) as amount_type,
        CASE WHEN amount IS NULL THEN 'NULL' ELSE 'NOT_NULL' END as null_check
      FROM predictions 
      ORDER BY created_at DESC 
      LIMIT 10
    `;
    
    const amountResult = await db.query(amountCheckQuery);
    console.log(`🔍 Amount check: ${amountResult.rows.length} predictions`);
    
    // Try different aggregation approaches
    const sumTestQuery = `
      SELECT 
        user_address,
        COUNT(*) as prediction_count,
        SUM(amount) as sum_amount,
        SUM(CAST(amount AS DECIMAL)) as sum_decimal,
        SUM(amount::NUMERIC) as sum_numeric,
        array_agg(amount) as all_amounts
      FROM predictions 
      GROUP BY user_address 
      LIMIT 5
    `;
    
    const sumResult = await db.query(sumTestQuery);
    console.log(`🔍 Sum test: ${sumResult.rows.length} users`);
    
    // Compare with working point_balances
    const pointsTestQuery = `
      SELECT 
        user_address,
        total_points,
        pg_typeof(total_points) as points_type
      FROM point_balances 
      LIMIT 5
    `;
    
    const pointsResult = await db.query(pointsTestQuery);
    console.log(`🔍 Points test: ${pointsResult.rows.length} users`);
    
    res.json({
      status: 'AMOUNT DEBUG',
      predictions_amounts: amountResult.rows,
      sum_tests: sumResult.rows,
      points_comparison: pointsResult.rows,
      diagnosis: {
        predictions_exist: amountResult.rows.length > 0,
        amounts_have_values: amountResult.rows.some(row => row.amount !== null),
        sum_working: sumResult.rows.some(row => parseFloat(row.sum_amount) > 0)
      }
    });
  } catch (error) {
    console.error('🔍 AMOUNT DEBUG ERROR:', error);
    res.status(500).json({ error: 'Amount debug failed', details: error.message });
  }
});

// Simple predictions count test
router.get('/test-simple', async (req, res) => {
  try {
    console.log('🧪 SIMPLE TEST: Basic predictions check...');
    
    // Just count predictions
    const countQuery = 'SELECT COUNT(*) as total FROM predictions';
    const countResult = await db.query(countQuery);
    
    // Get a few raw predictions
    const rawQuery = 'SELECT * FROM predictions LIMIT 3';
    const rawResult = await db.query(rawQuery);
    
    console.log(`🧪 Predictions count: ${countResult.rows[0].total}`);
    
    res.json({
      predictions_count: countResult.rows[0].total,
      sample_predictions: rawResult.rows,
      test_passed: parseInt(countResult.rows[0].total) > 0
    });
  } catch (error) {
    console.error('🧪 SIMPLE TEST ERROR:', error);
    res.status(500).json({ error: 'Simple test failed', details: error.message });
  }
});

module.exports = router; 