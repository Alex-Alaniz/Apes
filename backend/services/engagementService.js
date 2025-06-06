const supabase = require('../config/supabase');

// Activity types and their point values
const ACTIVITY_POINTS = {
  // Connection and setup activities
  CONNECT_WALLET: 25,      // First time connecting to dApp
  COMPLETE_PROFILE: 50,
  LINK_TWITTER: 100,       // Linking Twitter account
  
  // Prediction activities
  PLACE_PREDICTION: 10,
  WIN_PREDICTION: 50,
  FIRST_PREDICTION_DAILY: 20,
  
  // Market activities
  CREATE_MARKET: 100,
  
  // Social activities
  DAILY_LOGIN: 5,
  SHARE_MARKET: 25,
  COMMENT_MARKET: 5,
  FOLLOW_USER: 10,
  GET_FOLLOWED: 15,
  
  // Twitter activities
  FOLLOW_PRIMAPE: 50,
  TWITTER_LIKE: 5,
  TWITTER_REPOST: 10,
  TWITTER_COMMENT: 15,
};

// Activities that require Twitter
const TWITTER_REQUIRED_ACTIVITIES = [
  'TWITTER_LIKE',
  'TWITTER_REPOST', 
  'TWITTER_COMMENT',
  'FOLLOW_PRIMAPE',
  'DAILY_LOGIN', // Now requires Twitter
];

// Tier thresholds and multipliers
const TIERS = {
  BRONZE: { min: 0, max: 999, multiplier: 1.0, name: 'Bronze' },
  SILVER: { min: 1000, max: 4999, multiplier: 1.1, name: 'Silver' },
  GOLD: { min: 5000, max: 9999, multiplier: 1.25, name: 'Gold' },
  PLATINUM: { min: 10000, max: Infinity, multiplier: 1.5, name: 'Platinum' },
};

class EngagementService {
  // Check if user has Twitter linked
  async hasTwitterLinked(userAddress) {
    const { data: result, error } = await supabase
      .from('users')
      .select('twitter_id')
      .eq('wallet_address', userAddress)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error checking Twitter link:', error);
      throw error;
    }
    
    return result && result.twitter_id !== null;
  }

  // Track an activity and award points
  async trackActivity(userAddress, activityType, metadata = {}) {
    try {
      const points = ACTIVITY_POINTS[activityType] || 0;
      if (points === 0) {
        console.warn(`Unknown activity type: ${activityType}`);
        return null;
      }

      // Check if activity requires Twitter
      if (TWITTER_REQUIRED_ACTIVITIES.includes(activityType)) {
        const hasTwitter = await this.hasTwitterLinked(userAddress);
        if (!hasTwitter) {
          throw new Error('Twitter account must be linked for this activity');
        }
      }

      // Check for special conditions
      let finalPoints = points;
      
      // Check if this is the first prediction of the day
      if (activityType === 'PLACE_PREDICTION') {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        
        const { data: checkResult, error: checkError } = await supabase
          .from('engagement_points')
          .select('id', { count: 'exact' })
          .eq('user_address', userAddress)
          .eq('activity_type', 'PLACE_PREDICTION')
          .gte('created_at', todayStart.toISOString());
        
        if (checkError) {
          console.error('Error checking daily prediction:', checkError);
        } else if (checkResult.length === 0) {
          // Award bonus for first prediction of the day
          await this.trackActivity(userAddress, 'FIRST_PREDICTION_DAILY', metadata);
        }
      }

      // Insert the engagement activity
      const requiresTwitter = TWITTER_REQUIRED_ACTIVITIES.includes(activityType);
      const tweetId = metadata.tweet_id || null;
      
      const { data: result, error: insertError } = await supabase
        .from('engagement_points')
        .insert({
          user_address: userAddress,
          activity_type: activityType,
          points_earned: finalPoints,
          metadata: metadata,
          requires_twitter: requiresTwitter,
          tweet_id: tweetId
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error inserting engagement points:', insertError);
        throw insertError;
      }

      // **NEW: Update point_balances table immediately for real-time display**
      await this.updatePointBalance(userAddress);

      console.log(`Awarded ${finalPoints} points to ${userAddress} for ${activityType}`);
      return result;
    } catch (error) {
      console.error('Error tracking activity:', error);
      throw error;
    }
  }

  // **NEW: Update point_balances table for real-time sync**
  async updatePointBalance(userAddress) {
    try {
      // Calculate total points from engagement_points table
      const { data: pointsData, error: pointsError } = await supabase
        .from('engagement_points')
        .select('points_earned')
        .eq('user_address', userAddress);

      if (pointsError) {
        console.error('Error calculating total points:', pointsError);
        throw pointsError;
      }

      const totalPoints = pointsData.reduce((sum, record) => sum + (record.points_earned || 0), 0);

      // Check if point_balances record exists
      const { data: existingBalance, error: balanceError } = await supabase
        .from('point_balances')
        .select('claimed_points')
        .eq('user_address', userAddress)
        .single();

      const claimedPoints = existingBalance?.claimed_points || 0;
      const availablePoints = totalPoints - claimedPoints;

      if (balanceError && balanceError.code !== 'PGRST116') {
        console.error('Error checking point balance:', balanceError);
        throw balanceError;
      }

      // Upsert point_balances record
      const { error: upsertError } = await supabase
        .from('point_balances')
        .upsert({
          user_address: userAddress,
          total_points: totalPoints,
          available_points: availablePoints,
          claimed_points: claimedPoints,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_address'
        });

      if (upsertError) {
        console.error('Error updating point balance:', upsertError);
        throw upsertError;
      }

      console.log(`✅ Updated point balance for ${userAddress}: ${totalPoints} total, ${availablePoints} available`);
      return { totalPoints, availablePoints, claimedPoints };
    } catch (error) {
      console.error('Error updating point balance:', error);
      // Don't throw - this is a background update
    }
  }

  // Get user's point balance and tier
  async getBalance(userAddress) {
    try {
      // Get balance from point_balances table
      const { data: balance, error: balanceError } = await supabase
        .from('point_balances')
        .select('total_points, claimed_points, available_points, last_claim_date')
        .eq('user_address', userAddress)
        .single();
      
      if (balanceError && balanceError.code !== 'PGRST116') {
        console.error('Error fetching balance:', balanceError);
        throw balanceError;
      }
      
      if (!balance) {
        // User has no points yet
        return {
          total_points: 0,
          available_points: 0,
          claimed_points: 0,
          tier: TIERS.BRONZE.name,
          multiplier: TIERS.BRONZE.multiplier,
          next_milestone: TIERS.SILVER.min,
          last_claim_date: null,
          has_twitter_linked: await this.hasTwitterLinked(userAddress)
        };
      }
      const totalPoints = parseInt(balance.total_points);
      
      // Determine tier
      let currentTier = TIERS.BRONZE;
      let nextMilestone = TIERS.SILVER.min;
      
      for (const [key, tier] of Object.entries(TIERS)) {
        if (totalPoints >= tier.min && totalPoints <= tier.max) {
          currentTier = tier;
          // Find next tier
          const tierKeys = Object.keys(TIERS);
          const currentIndex = tierKeys.indexOf(key);
          if (currentIndex < tierKeys.length - 1) {
            nextMilestone = TIERS[tierKeys[currentIndex + 1]].min;
          } else {
            nextMilestone = null; // Max tier reached
          }
          break;
        }
      }

      // Get recent activities
      const { data: activitiesResult, error: activitiesError } = await supabase
        .from('engagement_points')
        .select('activity_type, points_earned, created_at')
        .eq('user_address', userAddress)
        .order('created_at', { ascending: false })
        .limit(10);

      if (activitiesError) {
        console.error('Error fetching activities:', activitiesError);
        // Continue without activities
      }

      // Check follower count for bonus
      const { data: userResult, error: userError } = await supabase
        .from('users')
        .select('twitter_followers')
        .eq('wallet_address', userAddress)
        .single();

      if (userError && userError.code !== 'PGRST116') {
        console.error('Error fetching user data:', userError);
      }
      
      const followerBonus = userResult?.twitter_followers >= 1000 ? 1.1 : 1.0;

      return {
        total_points: totalPoints,
        available_points: parseInt(balance.available_points),
        claimed_points: parseInt(balance.claimed_points),
        tier: currentTier.name,
        multiplier: currentTier.multiplier * followerBonus,
        next_milestone: nextMilestone,
        last_claim_date: balance.last_claim_date,
        recent_activities: activitiesResult || [],
        has_twitter_linked: await this.hasTwitterLinked(userAddress),
        follower_bonus: followerBonus
      };
    } catch (error) {
      console.error('Error getting balance:', error);
      throw error;
    }
  }

  // Check if user can claim airdrop
  async canClaimAirdrop(userAddress) {
    try {
      const balance = await this.getBalance(userAddress);
      
      // Must have Twitter linked
      if (!balance.has_twitter_linked) {
        return {
          canClaim: false,
          reason: 'Twitter account must be linked to claim'
        };
      }
      
      // Must have placed predictions to be eligible for airdrops
      const { data: eligibilityResult, error: eligibilityError } = await supabase
        .from('predictions')
        .select('id', { count: 'exact' })
        .eq('user_address', userAddress);
      
      if (eligibilityError) {
        console.error('Error checking prediction eligibility:', eligibilityError);
        // Continue with predictionCount = 0
      }
      
      const predictionCount = eligibilityResult?.length || 0;
      
      if (predictionCount === 0) {
        return {
          canClaim: false,
          reason: 'Must place at least one prediction to claim airdrops. Engagement points alone are not sufficient for airdrop eligibility.'
        };
      }
      
      // Check minimum points threshold (500)
      if (balance.available_points < 500) {
        return {
          canClaim: false,
          reason: 'Minimum 500 points required to claim'
        };
      }

      // Check cooldown period (24 hours)
      if (balance.last_claim_date) {
        const lastClaim = new Date(balance.last_claim_date);
        const now = new Date();
        const hoursSinceLastClaim = (now - lastClaim) / (1000 * 60 * 60);
        
        if (hoursSinceLastClaim < 24) {
          const hoursRemaining = Math.ceil(24 - hoursSinceLastClaim);
          return {
            canClaim: false,
            reason: `Please wait ${hoursRemaining} more hours before claiming again`
          };
        }
      }

      return {
        canClaim: true,
        availablePoints: balance.available_points,
        multiplier: balance.multiplier,
        tier: balance.tier,
        predictionCount: predictionCount
      };
    } catch (error) {
      console.error('Error checking claim eligibility:', error);
      throw error;
    }
  }

  // Calculate APES amount for points (without claiming)
  calculateApesAmount(points, multiplier) {
    const baseRate = 0.1; // 100 points = 10 APES (0.1 APES per point)
    return points * baseRate * multiplier;
  }

  // Get leaderboard for engagement
  async getEngagementLeaderboard(limit = 10) {
    try {
      // Get point balances with user data using Supabase
      const { data: result, error: balanceError } = await supabase
        .from('point_balances')
        .select(`
          user_address,
          total_points,
          claimed_points,
          users!inner(
            username,
            twitter_username,
            twitter_followers
          )
        `)
        .order('total_points', { ascending: false })
        .limit(limit);

      if (balanceError) {
        console.error('Error fetching leaderboard:', balanceError);
        throw balanceError;
      }

      if (!result || result.length === 0) {
        console.log('📭 No point balances found - empty leaderboard');
        return [];
      }
      
      return result.map((row, index) => {
        const totalPoints = parseInt(row.total_points);
        let tier = TIERS.BRONZE;
        
        for (const t of Object.values(TIERS)) {
          if (totalPoints >= t.min && totalPoints <= t.max) {
            tier = t;
            break;
          }
        }
        
        return {
          user_address: row.user_address,
          username: row.users.username,
          twitter_username: row.users.twitter_username,
          twitter_followers: row.users.twitter_followers,
          rank: index + 1,
          tier: tier.name,
          total_points: totalPoints,
          claimed_points: parseInt(row.claimed_points),
          has_twitter: !!row.users.twitter_username,
          active_days: 0, // Will calculate separately if needed
          unique_activities: 0 // Will calculate separately if needed
        };
      });
    } catch (error) {
      console.error('Error getting engagement leaderboard:', error);
      throw error;
    }
  }

  // Check and award streak bonuses
  async checkStreaks(userAddress) {
    try {
      const { data: result, error: streakError } = await supabase
        .from('engagement_points')
        .select('created_at')
        .eq('user_address', userAddress)
        .eq('activity_type', 'PLACE_PREDICTION')
        .order('created_at', { ascending: false });

      if (streakError) {
        console.error('Error fetching streak data:', streakError);
        return;
      }
      
      if (!result || result.length === 0) return;
      
      // Check for consecutive days
      let streak = 1;
      const dates = result.map(row => new Date(row.created_at).toDateString());
      const uniqueDates = [...new Set(dates)].sort((a, b) => new Date(b) - new Date(a));
      
      for (let i = 1; i < uniqueDates.length; i++) {
        const prev = new Date(uniqueDates[i-1]);
        const curr = new Date(uniqueDates[i]);
        const diff = (prev - curr) / (1000 * 60 * 60 * 24);
        if (diff === 1) {
          streak++;
        } else {
          break;
        }
      }

      // Award streak bonuses
      const streakBonuses = {
        3: { points: 50, type: 'STREAK_3_DAYS' },
        7: { points: 150, type: 'STREAK_7_DAYS' },
        30: { points: 1000, type: 'STREAK_30_DAYS' }
      };

      for (const [days, bonus] of Object.entries(streakBonuses)) {
        if (streak >= parseInt(days)) {
          // Check if already awarded in recent period
          const recentDate = new Date();
          recentDate.setDate(recentDate.getDate() - parseInt(days));
          
          const { data: checkResult, error: checkError } = await supabase
            .from('engagement_points')
            .select('id', { count: 'exact' })
            .eq('user_address', userAddress)
            .eq('activity_type', bonus.type)
            .gte('created_at', recentDate.toISOString());
          
          if (checkError) {
            console.error('Error checking streak bonus:', checkError);
            continue;
          }
          
          if (checkResult.length === 0) {
            // Award the streak bonus
            await this.trackActivity(userAddress, bonus.type, { streak_days: days });
            console.log(`Awarded ${days}-day streak bonus to ${userAddress}`);
          }
        }
      }
    } catch (error) {
      console.error('Error checking streaks:', error);
    }
  }

  // Get Twitter engagement stats
  async getTwitterEngagementStats(userAddress) {
    try {
      const { data: result, error: twitterError } = await supabase
        .from('twitter_engagements')
        .select('tweet_id, engagement_type, points_awarded')
        .eq('user_address', userAddress);

      if (twitterError) {
        console.error('Error fetching Twitter engagement stats:', twitterError);
        throw twitterError;
      }

      if (!result || result.length === 0) {
        return {
          tweets_engaged: 0,
          likes: 0,
          reposts: 0,
          comments: 0,
          total_twitter_points: 0
        };
      }

      const uniqueTweets = new Set(result.map(r => r.tweet_id)).size;
      const likes = result.filter(r => r.engagement_type === 'like').length;
      const reposts = result.filter(r => r.engagement_type === 'repost').length;
      const comments = result.filter(r => r.engagement_type === 'comment').length;
      const totalPoints = result.reduce((sum, r) => sum + (r.points_awarded || 0), 0);
      
      return {
        tweets_engaged: uniqueTweets,
        likes: likes,
        reposts: reposts,
        comments: comments,
        total_twitter_points: totalPoints
      };
    } catch (error) {
      console.error('Error getting Twitter engagement stats:', error);
      throw error;
    }
  }
}

module.exports = new EngagementService(); 