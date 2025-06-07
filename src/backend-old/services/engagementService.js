const db = require('../config/database');

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
    const result = await db.query(
      'SELECT twitter_id FROM users WHERE wallet_address = $1',
      [userAddress]
    );
    return result.rows.length > 0 && result.rows[0].twitter_id !== null;
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
        
        const checkQuery = `
          SELECT COUNT(*) as count 
          FROM engagement_points 
          WHERE user_address = $1 
            AND activity_type = 'PLACE_PREDICTION'
            AND created_at >= $2
        `;
        const checkResult = await db.query(checkQuery, [userAddress, todayStart]);
        
        if (checkResult.rows[0].count === '0') {
          // Award bonus for first prediction of the day
          await this.trackActivity(userAddress, 'FIRST_PREDICTION_DAILY', metadata);
        }
      }

      // Insert the engagement activity
      const insertQuery = `
        INSERT INTO engagement_points (user_address, activity_type, points_earned, metadata, requires_twitter, tweet_id)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      
      const requiresTwitter = TWITTER_REQUIRED_ACTIVITIES.includes(activityType);
      const tweetId = metadata.tweet_id || null;
      
      const result = await db.query(insertQuery, [
        userAddress,
        activityType,
        finalPoints,
        JSON.stringify(metadata),
        requiresTwitter,
        tweetId
      ]);

      console.log(`Awarded ${finalPoints} points to ${userAddress} for ${activityType}`);
      return result.rows[0];
    } catch (error) {
      console.error('Error tracking activity:', error);
      throw error;
    }
  }

  // Get user's point balance and tier
  async getBalance(userAddress) {
    try {
      // Get balance from point_balances table
      const balanceQuery = `
        SELECT 
          total_points,
          claimed_points,
          available_points,
          last_claim_date
        FROM point_balances
        WHERE user_address = $1
      `;
      
      const balanceResult = await db.query(balanceQuery, [userAddress]);
      
      if (balanceResult.rows.length === 0) {
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

      const balance = balanceResult.rows[0];
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
      const activitiesQuery = `
        SELECT activity_type, points_earned, created_at
        FROM engagement_points
        WHERE user_address = $1
        ORDER BY created_at DESC
        LIMIT 10
      `;
      const activitiesResult = await db.query(activitiesQuery, [userAddress]);

      // Check follower count for bonus
      const userQuery = `SELECT twitter_followers FROM users WHERE wallet_address = $1`;
      const userResult = await db.query(userQuery, [userAddress]);
      const followerBonus = userResult.rows[0]?.twitter_followers >= 1000 ? 1.1 : 1.0;

      return {
        total_points: totalPoints,
        available_points: parseInt(balance.available_points),
        claimed_points: parseInt(balance.claimed_points),
        tier: currentTier.name,
        multiplier: currentTier.multiplier * followerBonus,
        next_milestone: nextMilestone,
        last_claim_date: balance.last_claim_date,
        recent_activities: activitiesResult.rows,
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
      const airdropEligibilityQuery = `
        SELECT COUNT(DISTINCT p.id) as prediction_count
        FROM users u
        LEFT JOIN predictions p ON u.wallet_address = p.user_address
        WHERE u.wallet_address = $1
        GROUP BY u.wallet_address
      `;
      
      const eligibilityResult = await db.query(airdropEligibilityQuery, [userAddress]);
      const predictionCount = eligibilityResult.rows[0]?.prediction_count || 0;
      
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
      const query = `
        SELECT 
          pb.user_address,
          u.username,
          u.twitter_username,
          pb.total_points,
          pb.claimed_points,
          COUNT(DISTINCT DATE(ep.created_at)) as active_days,
          COUNT(DISTINCT ep.activity_type) as unique_activities,
          u.twitter_followers
        FROM point_balances pb
        JOIN users u ON pb.user_address = u.wallet_address
        LEFT JOIN engagement_points ep ON pb.user_address = ep.user_address
        GROUP BY pb.user_address, u.username, u.twitter_username, pb.total_points, pb.claimed_points, u.twitter_followers
        ORDER BY pb.total_points DESC
        LIMIT $1
      `;
      
      const result = await db.query(query, [limit]);
      
      return result.rows.map((row, index) => {
        const totalPoints = parseInt(row.total_points);
        let tier = TIERS.BRONZE;
        
        for (const t of Object.values(TIERS)) {
          if (totalPoints >= t.min && totalPoints <= t.max) {
            tier = t;
            break;
          }
        }
        
        return {
          ...row,
          rank: index + 1,
          tier: tier.name,
          total_points: totalPoints,
          claimed_points: parseInt(row.claimed_points),
          has_twitter: !!row.twitter_username
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
      const query = `
        SELECT DISTINCT DATE(created_at) as activity_date
        FROM engagement_points
        WHERE user_address = $1
          AND activity_type = 'PLACE_PREDICTION'
        ORDER BY activity_date DESC
      `;
      
      const result = await db.query(query, [userAddress]);
      
      if (result.rows.length === 0) return;
      
      // Check for consecutive days
      let streak = 1;
      const dates = result.rows.map(row => new Date(row.activity_date));
      
      for (let i = 1; i < dates.length; i++) {
        const diff = (dates[i-1] - dates[i]) / (1000 * 60 * 60 * 24);
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
          // Check if already awarded
          const checkQuery = `
            SELECT COUNT(*) as count
            FROM engagement_points
            WHERE user_address = $1
              AND activity_type = $2
              AND created_at >= CURRENT_DATE - INTERVAL '${days} days'
          `;
          
          const checkResult = await db.query(checkQuery, [userAddress, bonus.type]);
          
          if (checkResult.rows[0].count === '0') {
            // Award the streak bonus
            await db.query(
              'INSERT INTO engagement_points (user_address, activity_type, points_earned, metadata) VALUES ($1, $2, $3, $4)',
              [userAddress, bonus.type, bonus.points, JSON.stringify({ streak_days: days })]
            );
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
      const query = `
        SELECT 
          COUNT(DISTINCT tweet_id) as tweets_engaged,
          SUM(CASE WHEN engagement_type = 'like' THEN 1 ELSE 0 END) as likes,
          SUM(CASE WHEN engagement_type = 'repost' THEN 1 ELSE 0 END) as reposts,
          SUM(CASE WHEN engagement_type = 'comment' THEN 1 ELSE 0 END) as comments,
          SUM(points_awarded) as total_twitter_points
        FROM twitter_engagements
        WHERE user_address = $1
      `;
      
      const result = await db.query(query, [userAddress]);
      
      return {
        tweets_engaged: parseInt(result.rows[0].tweets_engaged || 0),
        likes: parseInt(result.rows[0].likes || 0),
        reposts: parseInt(result.rows[0].reposts || 0),
        comments: parseInt(result.rows[0].comments || 0),
        total_twitter_points: parseInt(result.rows[0].total_twitter_points || 0)
      };
    } catch (error) {
      console.error('Error getting Twitter engagement stats:', error);
      throw error;
    }
  }
}

module.exports = new EngagementService(); 