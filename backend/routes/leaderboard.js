const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

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
    const { sortBy = 'engagement', timeframe = 'all' } = req.query;
    
    console.log('🏆 Fetching leaderboard with sortBy:', sortBy);
    
    // Simplified leaderboard for current mainnet state (mostly engagement points)
    const { data: pointBalances, error: pointError } = await supabase
      .from('point_balances')
      .select(`
        user_address,
        total_points,
        claimed_points,
        available_points,
        users!inner(
          username,
          twitter_username,
          created_at
        )
      `)
      .order('total_points', { ascending: false })
      .limit(100);

    if (pointError) {
      console.error('Error fetching point balances:', pointError);
    }

    // Also get users without point balances but show them with 0 points
    const { data: allUsers, error: userError } = await supabase
      .from('users')
      .select('wallet_address, username, twitter_username, created_at')
      .limit(100);

    if (userError) {
      console.error('Error fetching users:', userError);
    }

    // Combine data and create leaderboard
    const leaderboard = [];
    const processedUsers = new Set();

    // Add users with points first
    if (pointBalances) {
      pointBalances.forEach((entry, index) => {
        processedUsers.add(entry.user_address);
        leaderboard.push({
          wallet_address: entry.user_address,
          username: entry.users.username,
          twitter_username: entry.users.twitter_username,
          connected_at: entry.users.created_at,
          total_predictions: 0,
          total_invested: 0,
          winning_predictions: 0,
          total_profit: 0,
          win_rate: 0,
          engagement_points: parseInt(entry.total_points) || 0,
          available_points: parseInt(entry.available_points) || 0,
          airdrop_eligible: false,
          activity_status: 'active',
          position: index + 1,
          rank: 'Beginner'
        });
      });
    }

    // Add users without points but limit total to 100
    if (allUsers && leaderboard.length < 100) {
      allUsers.forEach((user, index) => {
        if (!processedUsers.has(user.wallet_address) && leaderboard.length < 100) {
          leaderboard.push({
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
            activity_status: 'new',
            position: leaderboard.length + 1,
            rank: 'Beginner'
          });
        }
      });
    }

    console.log(`📊 Leaderboard found ${leaderboard.length} users`);
    
    res.json({ leaderboard });
  } catch (error) {
    console.error('Error in leaderboard endpoint:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// Get top performers
router.get('/top-performers', async (req, res) => {
  try {
    console.log('🏆 Fetching top performers...');
    
    // For current mainnet state, focus on engagement points since that's the main activity
    const { data: topEngagement, error: engagementError } = await supabase
      .from('point_balances')
      .select(`
        user_address,
        total_points,
        claimed_points,
        available_points,
        users!inner(
          username,
          twitter_username
        )
      `)
      .order('total_points', { ascending: false })
      .limit(3);

    if (engagementError) {
      console.error('Error fetching top engagement:', engagementError);
    }

    // Create formatted results
    const formatUser = (user) => ({
      wallet_address: user.user_address,
      username: user.users.username,
      twitter_username: user.users.twitter_username,
      total_predictions: 0,
      total_invested: 0,
      winning_predictions: 0,
      total_profit: 0,
      win_rate: 0,
      engagement_points: parseInt(user.total_points) || 0,
      available_points: parseInt(user.available_points) || 0,
      airdrop_eligible: false,
      rank: 'Beginner'
    });

    const topPerformers = {
      topProfit: [], // Empty for mainnet launch
      topAccuracy: [], // Empty for mainnet launch  
      topVolume: [], // Empty for mainnet launch
      topEngagement: topEngagement ? topEngagement.map(formatUser) : []
    };

    console.log(`📊 Top performers: ${topPerformers.topEngagement.length} engagement leaders`);

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
    
    console.log('🎯 Fetching user rank for:', walletAddress);
    
    // Get user's point balance
    const { data: pointBalance, error: pointError } = await supabase
      .from('point_balances')
      .select('total_points, available_points, claimed_points')
      .eq('user_address', walletAddress)
      .single();

    if (pointError && pointError.code !== 'PGRST116') {
      console.error('Error fetching user points:', pointError);
    }

    // Get total number of users with points for ranking
    const { data: allPointBalances, error: rankError } = await supabase
      .from('point_balances')
      .select('user_address, total_points')
      .order('total_points', { ascending: false });

    if (rankError) {
      console.error('Error fetching all point balances for ranking:', rankError);
    }

    // Calculate engagement rank
    let engagementRank = null;
    if (pointBalance && allPointBalances) {
      const userPoints = parseInt(pointBalance.total_points) || 0;
      engagementRank = allPointBalances.findIndex(pb => pb.user_address === walletAddress) + 1;
      if (engagementRank === 0) engagementRank = null;
    }

    const userRank = {
      wallet_address: walletAddress,
      total_predictions: 0,
      total_invested: 0,
      total_profit: 0,
      win_rate: 0,
      engagement_points: pointBalance ? parseInt(pointBalance.total_points) || 0 : 0,
      available_points: pointBalance ? parseInt(pointBalance.available_points) || 0 : 0,
      airdrop_eligible: false,
      profit_rank: null,
      accuracy_rank: null,
      volume_rank: null,
      engagement_rank: engagementRank
    };

    console.log(`📊 User rank: ${engagementRank || 'unranked'}, Points: ${userRank.engagement_points}`);
    
    res.json({ userRank });
  } catch (error) {
    console.error('Error fetching user rank:', error);
    res.status(500).json({ error: 'Failed to fetch user rank' });
  }
});

module.exports = router; 