const { TwitterApi } = require('twitter-api-v2');
const crypto = require('crypto');
const db = require('../config/database');

// Encryption helper functions
const algorithm = 'aes-256-gcm';
const secretKey = (() => {
  const key = process.env.TWITTER_ENCRYPTION_KEY;
  if (key) {
    // Ensure key is exactly 32 bytes for AES-256
    const keyBuffer = Buffer.from(key, 'hex');
    if (keyBuffer.length === 32) {
      return keyBuffer;
    }
    // If not 32 bytes, hash it to get consistent 32 bytes
    return crypto.createHash('sha256').update(key).digest();
  }
  // Generate random key if none provided
  return crypto.randomBytes(32);
})();

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

function decrypt(encryptedData) {
  const parts = encryptedData.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  
  const decipher = crypto.createDecipheriv(algorithm, secretKey, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

class TwitterService {
  constructor() {
    // Initialize Twitter client with app credentials
    this.appClient = new TwitterApi({
      clientId: process.env.TWITTER_CLIENT_ID,
      clientSecret: process.env.TWITTER_CLIENT_SECRET,
    });

    this.callbackURL = process.env.TWITTER_CALLBACK_URL || 'http://localhost:3000/auth/twitter/callback';
    this.primapeAccountId = process.env.PRIMAPE_TWITTER_ID || '1234567890'; // Replace with actual ID
  }

  // Generate OAuth 2.0 authorization URL
  async generateAuthLink(state) {
    const { url, codeVerifier } = this.appClient.generateOAuth2AuthLink(
      this.callbackURL,
      {
        scope: ['tweet.read', 'users.read', 'follows.read', 'like.read', 'offline.access'],
        state,
      }
    );
    
    // Store code verifier temporarily (in production, use Redis)
    // For now, return it to be stored client-side
    return { url, codeVerifier };
  }

  // Complete OAuth flow and get tokens
  async handleCallback(code, codeVerifier, walletAddress) {
    try {
      const { client: userClient, accessToken, refreshToken } = await this.appClient.loginWithOAuth2({
        code,
        codeVerifier,
        redirectUri: this.callbackURL,
      });

      // Get user info
      const { data: userInfo } = await userClient.v2.me();

      // Ensure user exists in database
      const existingUser = await db.query(
        'SELECT wallet_address FROM users WHERE wallet_address = $1',
        [walletAddress]
      );

      if (existingUser.rows.length === 0) {
        // Create user if doesn't exist
        await db.query(
          'INSERT INTO users (wallet_address) VALUES ($1) ON CONFLICT (wallet_address) DO NOTHING',
          [walletAddress]
        );

        // Initialize user stats
        await db.query(
          'INSERT INTO user_stats (wallet_address) VALUES ($1) ON CONFLICT (wallet_address) DO NOTHING',
          [walletAddress]
        );
      }

      // Store encrypted tokens
      const encryptedAccess = encrypt(accessToken);
      const encryptedRefresh = encrypt(refreshToken);

      await db.query(
        `INSERT INTO twitter_oauth_tokens (user_address, access_token, refresh_token, expires_at)
         VALUES ($1, $2, $3, NOW() + INTERVAL '2 hours')
         ON CONFLICT (user_address) DO UPDATE
         SET access_token = $2, refresh_token = $3, expires_at = NOW() + INTERVAL '2 hours', updated_at = NOW()`,
        [walletAddress, encryptedAccess, encryptedRefresh]
      );

      // Update user profile with Twitter info
      await db.query(
        `UPDATE users 
         SET twitter_id = $1, twitter_username = $2, twitter_linked_at = NOW()
         WHERE wallet_address = $3`,
        [userInfo.id, userInfo.username, walletAddress]
      );

      // Award one-time linking bonus
      await db.query(
        `INSERT INTO engagement_points (user_address, activity_type, points_earned, metadata, requires_twitter)
         VALUES ($1, 'LINK_TWITTER', 100, $2, true)
         ON CONFLICT DO NOTHING`,
        [walletAddress, JSON.stringify({ twitter_id: userInfo.id })]
      );

      return {
        success: true,
        twitter_id: userInfo.id,
        twitter_username: userInfo.username,
      };
    } catch (error) {
      console.error('Twitter OAuth callback error:', error);
      throw error;
    }
  }

  // Get user client from stored tokens
  async getUserClient(walletAddress) {
    const result = await db.query(
      'SELECT access_token, refresh_token, expires_at FROM twitter_oauth_tokens WHERE user_address = $1',
      [walletAddress]
    );

    if (result.rows.length === 0) {
      throw new Error('No Twitter tokens found for user');
    }

    const { access_token, refresh_token, expires_at } = result.rows[0];
    
    // Decrypt tokens
    const accessToken = decrypt(access_token);
    const refreshToken = decrypt(refresh_token);

    // Check if token needs refresh
    if (new Date() >= new Date(expires_at)) {
      return this.refreshUserToken(walletAddress, refreshToken);
    }

    return new TwitterApi(accessToken);
  }

  // Refresh expired token
  async refreshUserToken(walletAddress, refreshToken) {
    try {
      const { client: refreshedClient, accessToken, refreshToken: newRefreshToken } = 
        await this.appClient.refreshOAuth2Token(refreshToken);

      // Update stored tokens
      const encryptedAccess = encrypt(accessToken);
      const encryptedRefresh = encrypt(newRefreshToken);

      await db.query(
        `UPDATE twitter_oauth_tokens 
         SET access_token = $1, refresh_token = $2, expires_at = NOW() + INTERVAL '2 hours', updated_at = NOW()
         WHERE user_address = $3`,
        [encryptedAccess, encryptedRefresh, walletAddress]
      );

      return refreshedClient;
    } catch (error) {
      console.error('Token refresh error:', error);
      throw error;
    }
  }

  // Verify if user follows @PrimapeApp
  async verifyFollowing(walletAddress) {
    try {
      const userClient = await this.getUserClient(walletAddress);
      const { data: user } = await userClient.v2.me();
      
      // Check if following
      const following = await userClient.v2.following(user.id, {
        max_results: 1000,
        'user.fields': 'id',
      });

      const isFollowing = following.data.some(account => account.id === this.primapeAccountId);

      if (isFollowing) {
        // Check if already awarded
        const existing = await db.query(
          `SELECT id FROM twitter_engagements 
           WHERE user_address = $1 AND engagement_type = 'follow' AND tweet_id = $2`,
          [walletAddress, this.primapeAccountId]
        );

        if (existing.rows.length === 0) {
          // Award points for following
          await db.query(
            `INSERT INTO twitter_engagements (user_address, tweet_id, engagement_type, points_awarded)
             VALUES ($1, $2, 'follow', 50)`,
            [walletAddress, this.primapeAccountId]
          );

          await db.query(
            `INSERT INTO engagement_points (user_address, activity_type, points_earned, metadata, requires_twitter)
             VALUES ($1, 'FOLLOW_PRIMAPE', 50, $2, true)`,
            [walletAddress, JSON.stringify({ twitter_id: this.primapeAccountId })]
          );

          return { isFollowing: true, pointsAwarded: 50 };
        }
      }

      return { isFollowing, pointsAwarded: 0 };
    } catch (error) {
      console.error('Error verifying following:', error);
      throw error;
    }
  }

  // Fetch latest tweets from @PrimapeApp
  async fetchPrimapeTweets(limit = 10) {
    try {
      const tweets = await this.appClient.v2.userTimeline(this.primapeAccountId, {
        max_results: limit,
        'tweet.fields': 'created_at,public_metrics,attachments',
        'media.fields': 'url,preview_image_url',
        'expansions': 'attachments.media_keys',
      });

      // Cache tweets in database
      for (const tweet of tweets.data.data || []) {
        const mediaUrls = [];
        if (tweet.attachments && tweets.includes && tweets.includes.media) {
          tweet.attachments.media_keys.forEach(key => {
            const media = tweets.includes.media.find(m => m.media_key === key);
            if (media) {
              mediaUrls.push(media.url || media.preview_image_url);
            }
          });
        }

        await db.query(
          `INSERT INTO primape_tweets (tweet_id, content, media_urls, created_at, engagement_stats)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (tweet_id) DO UPDATE
           SET content = $2, engagement_stats = $5, last_updated = NOW()`,
          [
            tweet.id,
            tweet.text,
            JSON.stringify(mediaUrls),
            tweet.created_at,
            JSON.stringify(tweet.public_metrics)
          ]
        );
      }

      return tweets.data.data || [];
    } catch (error) {
      console.error('Error fetching Primape tweets:', error);
      throw error;
    }
  }

  // Validate user engagement (like, retweet, comment)
  async validateEngagement(walletAddress, tweetId, engagementType) {
    try {
      const userClient = await this.getUserClient(walletAddress);
      const { data: user } = await userClient.v2.me();

      let isValid = false;
      let points = 0;

      switch (engagementType) {
        case 'like':
          // Check if user liked the tweet
          const likedTweets = await userClient.v2.userLikedTweets(user.id, {
            max_results: 100,
            'tweet.fields': 'id',
          });
          isValid = likedTweets.data.some(tweet => tweet.id === tweetId);
          points = 5;
          break;

        case 'repost':
          // Check user's tweets for retweet
          const userTweets = await userClient.v2.userTimeline(user.id, {
            max_results: 100,
            'tweet.fields': 'referenced_tweets',
          });
          isValid = userTweets.data.data.some(tweet => 
            tweet.referenced_tweets?.some(ref => 
              ref.type === 'retweeted' && ref.id === tweetId
            )
          );
          points = 10;
          break;

        case 'comment':
          // Check for replies to the tweet
          const replies = await userClient.v2.search(`conversation_id:${tweetId} from:${user.username}`, {
            max_results: 10,
          });
          isValid = replies.data.data && replies.data.data.length > 0;
          points = 15;
          break;
      }

      if (isValid) {
        // Check if already awarded
        const existing = await db.query(
          `SELECT id FROM twitter_engagements 
           WHERE user_address = $1 AND tweet_id = $2 AND engagement_type = $3`,
          [walletAddress, tweetId, engagementType]
        );

        if (existing.rows.length === 0) {
          // Award points
          await db.query(
            `INSERT INTO twitter_engagements (user_address, tweet_id, engagement_type, points_awarded)
             VALUES ($1, $2, $3, $4)`,
            [walletAddress, tweetId, engagementType, points]
          );

          await db.query(
            `INSERT INTO engagement_points (user_address, activity_type, points_earned, metadata, requires_twitter, tweet_id)
             VALUES ($1, $2, $3, $4, true, $5)`,
            [
              walletAddress,
              `TWITTER_${engagementType.toUpperCase()}`,
              points,
              JSON.stringify({ tweet_id: tweetId }),
              tweetId
            ]
          );

          return { valid: true, points_awarded: points };
        }
      }

      return { valid: isValid, points_awarded: 0 };
    } catch (error) {
      console.error('Error validating engagement:', error);
      throw error;
    }
  }

  // Get user's Twitter engagement summary
  async getUserEngagementSummary(walletAddress) {
    try {
      // Get all Twitter engagements
      const engagements = await db.query(
        `SELECT engagement_type, COUNT(*) as count, SUM(points_awarded) as total_points
         FROM twitter_engagements
         WHERE user_address = $1
         GROUP BY engagement_type`,
        [walletAddress]
      );

      // Get recent tweets engaged with
      const recentTweets = await db.query(
        `SELECT DISTINCT te.tweet_id, pt.content, te.engagement_type, te.points_awarded, te.verified_at
         FROM twitter_engagements te
         JOIN primape_tweets pt ON te.tweet_id = pt.tweet_id
         WHERE te.user_address = $1
         ORDER BY te.verified_at DESC
         LIMIT 10`,
        [walletAddress]
      );

      return {
        summary: engagements.rows,
        recent_engagements: recentTweets.rows,
      };
    } catch (error) {
      console.error('Error getting engagement summary:', error);
      throw error;
    }
  }

  // Update user's follower count
  async updateFollowerCount(walletAddress) {
    try {
      const userClient = await this.getUserClient(walletAddress);
      const { data: user } = await userClient.v2.me({ 'user.fields': 'public_metrics' });
      
      const followerCount = user.public_metrics.followers_count;
      
      await db.query(
        'UPDATE users SET twitter_followers = $1 WHERE wallet_address = $2',
        [followerCount, walletAddress]
      );

      return followerCount;
    } catch (error) {
      console.error('Error updating follower count:', error);
      throw error;
    }
  }
}

module.exports = new TwitterService(); 