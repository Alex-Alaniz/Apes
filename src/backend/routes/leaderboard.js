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

// Get main leaderboard
router.get('/', async (req, res) => {
  try {
    const { sortBy = 'profit', timeframe = 'all' } = req.query;
    
    console.log(`🔍 Leaderboard query: sortBy=${sortBy}, timeframe=${timeframe}`);
    
    // Updated query to use predictions table for accurate APES tracking with more robust JOIN
    const query = `
      WITH user_stats AS (
        SELECT 
          u.wallet_address,
          u.username,
          u.twitter_username,
          u.created_at as connected_at,
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
          -- Add engagement points using MAX() for proper aggregation
          COALESCE(MAX(pb.total_points), 0) as engagement_points,
          COALESCE(MAX(pb.available_points), 0) as available_points,
          -- Flag for airdrop eligibility (requires betting activity)
          CASE WHEN COUNT(DISTINCT p.id) > 0 THEN true ELSE false END as airdrop_eligible,
          -- Activity status for cleanup
          CASE 
            WHEN COUNT(DISTINCT p.id) > 0 OR COALESCE(MAX(pb.total_points), 0) > 0 THEN 'active'
            WHEN u.created_at > NOW() - INTERVAL '7 days' THEN 'new'
            ELSE 'tourist'
          END as activity_status
        FROM users u
        LEFT JOIN predictions p ON TRIM(u.wallet_address) = TRIM(p.user_address)
        LEFT JOIN markets m ON TRIM(p.market_address) = TRIM(m.market_address)
        LEFT JOIN point_balances pb ON TRIM(u.wallet_address) = TRIM(pb.user_address)
        GROUP BY u.wallet_address, u.username, u.twitter_username, u.created_at
        -- Show ALL connected users (no HAVING clause restriction)
      )
      SELECT 
        wallet_address,
        username,
        twitter_username,
        connected_at,
        total_predictions::INTEGER,
        total_invested::DECIMAL,
        winning_predictions::INTEGER,
        total_profit::DECIMAL,
        win_rate::DECIMAL,
        engagement_points::INTEGER,
        available_points::INTEGER,
        airdrop_eligible::BOOLEAN,
        activity_status,
        ROW_NUMBER() OVER (
          ORDER BY 
            CASE 
              WHEN '${sortBy}' = 'profit' THEN total_profit
              WHEN '${sortBy}' = 'engagement' THEN engagement_points
              WHEN '${sortBy}' = 'volume' THEN total_invested
              WHEN '${sortBy}' = 'accuracy' THEN win_rate
              WHEN '${sortBy}' = 'recent' THEN EXTRACT(EPOCH FROM connected_at)
              ELSE total_profit
            END DESC
        ) as position
      FROM user_stats
      WHERE activity_status != 'tourist' OR '${sortBy}' = 'recent'  -- Hide tourists unless viewing recent users
      ORDER BY position
      LIMIT 100
    `;
    
    console.log('🔄 Executing leaderboard query...');
    const result = await db.query(query);
    console.log(`📊 Found ${result.rows.length} users for leaderboard`);
    
    // Log first few users with their investment data for debugging
    if (result.rows.length > 0) {
      console.log('📋 Sample leaderboard data:');
      result.rows.slice(0, 3).forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.wallet_address.substring(0, 8)}... - Invested: ${user.total_invested} APES, Predictions: ${user.total_predictions}`);
      });
    }
    
    // Always return database results (empty array if no data)
    const leaderboard = result.rows.map(user => convertToNumbers({
      ...user,
      rank: calculateRank(user.total_predictions, user.win_rate)
    }));
    
    res.json({ leaderboard });
  } catch (error) {
    console.error('Error in leaderboard endpoint:', error);
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

module.exports = router; 