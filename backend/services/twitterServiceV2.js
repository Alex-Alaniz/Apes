const { TwitterApi } = require('twitter-api-v2');
const crypto = require('crypto');
const db = require('../config/database');
const engagementService = require('./engagementService');

// Encryption helper functions (same as before)
const algorithm = 'aes-256-gcm';
const secretKey = (() => {
  const key = process.env.TWITTER_ENCRYPTION_KEY;
  if (key) {
    const keyBuffer = Buffer.from(key, 'hex');
    if (keyBuffer.length === 32) {
      return keyBuffer;
    }
    return crypto.createHash('sha256').update(key).digest();
  }
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

class TwitterServiceV2 {
  constructor() {
    this.appClient = new TwitterApi({
      clientId: process.env.TWITTER_CLIENT_ID,
      clientSecret: process.env.TWITTER_CLIENT_SECRET,
    });

    this.callbackURL = process.env.TWITTER_CALLBACK_URL || 'http://localhost:3000/auth/twitter/callback';
    this.primapeAccountId = process.env.PRIMAPE_TWITTER_ID || '1234567890';
  }

  async generateAuthLink(state) {
    const { url, codeVerifier } = this.appClient.generateOAuth2AuthLink(
      this.callbackURL,
      {
        scope: ['tweet.read', 'users.read', 'follows.read', 'like.read', 'offline.access'],
        state: state,
      }
    );
    
    return { url, codeVerifier };
  }

  // Updated to support multiple wallets per Twitter account
  async handleCallback(code, codeVerifier, walletAddress) {
    try {
      console.log('TwitterServiceV2.handleCallback called with:', {
        code: code ? `${code.substring(0, 10)}...` : 'null',
        codeVerifier: codeVerifier ? `${codeVerifier.substring(0, 10)}...` : 'null',
        walletAddress,
        callbackURL: this.callbackURL
      });

      const { client: userClient, accessToken, refreshToken } = await this.appClient.loginWithOAuth2({
        code,
        codeVerifier,
        redirectUri: this.callbackURL,
      });

      console.log('Twitter OAuth successful, got tokens');

      // Get user info from Twitter
      const { data: userInfo } = await userClient.v2.me();
      console.log('Got Twitter user info:', { id: userInfo.id, username: userInfo.username });

      // Check if this Twitter account already exists
      const existingTwitter = await db.query(
        'SELECT twitter_id FROM twitter_accounts WHERE twitter_id = $1',
        [userInfo.id]
      );

      if (existingTwitter.rows.length === 0) {
        // New Twitter account - create it
        await db.query(
          'INSERT INTO twitter_accounts (twitter_id, twitter_username, twitter_followers) VALUES ($1, $2, 0)',
          [userInfo.id, userInfo.username]
        );
      } else {
        // Update username in case it changed
        await db.query(
          'UPDATE twitter_accounts SET twitter_username = $1 WHERE twitter_id = $2',
          [userInfo.username, userInfo.id]
        );
      }

      // Check if this wallet is already linked to a different Twitter account
      const existingLink = await db.query(
        'SELECT twitter_id FROM wallet_twitter_links WHERE wallet_address = $1',
        [walletAddress]
      );

      if (existingLink.rows.length > 0 && existingLink.rows[0].twitter_id !== userInfo.id) {
        throw new Error('This wallet is already linked to a different Twitter account');
      }

      // Ensure user exists in database
      await db.query(
        'INSERT INTO users (wallet_address) VALUES ($1) ON CONFLICT (wallet_address) DO NOTHING',
        [walletAddress]
      );

      // Initialize user stats if needed
      await db.query(
        'INSERT INTO user_stats (wallet_address) VALUES ($1) ON CONFLICT (wallet_address) DO NOTHING',
        [walletAddress]
      );

      // Create or update wallet-twitter link
      const isFirstWallet = await db.query(
        'SELECT COUNT(*) as count FROM wallet_twitter_links WHERE twitter_id = $1',
        [userInfo.id]
      );

      await db.query(
        `INSERT INTO wallet_twitter_links (wallet_address, twitter_id, is_primary_wallet)
         VALUES ($1, $2, $3)
         ON CONFLICT (wallet_address, twitter_id) DO UPDATE
         SET linked_at = CURRENT_TIMESTAMP`,
        [walletAddress, userInfo.id, isFirstWallet.rows[0].count === '0']
      );

      // Update user record with Twitter info (for backward compatibility)
      await db.query(
        `UPDATE users 
         SET twitter_id = $1, twitter_username = $2, twitter_linked_at = NOW()
         WHERE wallet_address = $3`,
        [userInfo.id, userInfo.username, walletAddress]
      );

      // Store or update OAuth tokens
      const encryptedAccess = encrypt(accessToken);
      const encryptedRefresh = encrypt(refreshToken);

      await db.query(
        `INSERT INTO twitter_oauth_tokens (twitter_id, access_token, refresh_token, expires_at)
         VALUES ($1, $2, $3, NOW() + INTERVAL '2 hours')
         ON CONFLICT (twitter_id) DO UPDATE
         SET access_token = $2, refresh_token = $3, expires_at = NOW() + INTERVAL '2 hours', updated_at = NOW()`,
        [userInfo.id, encryptedAccess, encryptedRefresh]
      );

      // Award one-time linking bonus only if this is the first time this Twitter account is linked
      if (existingTwitter.rows.length === 0) {
        try {
          await engagementService.trackActivity(
            walletAddress, 
            'LINK_TWITTER', 
            { 
              twitter_id: userInfo.id,
              twitter_username: userInfo.username,
              first_link: true
            }
          );
        } catch (engagementError) {
          console.error('Failed to award Twitter linking points:', engagementError);
          // Don't fail the linking process if engagement tracking fails
        }
      }

      return {
        success: true,
        twitter_id: userInfo.id,
        twitter_username: userInfo.username,
        is_new_link: existingTwitter.rows.length === 0,
        message: existingTwitter.rows.length === 0 
          ? 'Twitter account linked successfully!' 
          : 'Additional wallet linked to your Twitter account!'
      };
    } catch (error) {
      console.error('Twitter OAuth callback error details:', {
        message: error.message,
        code: error.code,
        status: error.status,
        data: error.data,
        errors: error.errors,
        type: error.type,
        stack: error.stack
      });
      
      // More specific error handling for Twitter API errors
      if (error.data?.error === 'invalid_request') {
        console.error('Twitter API returned invalid_request - likely expired code or mismatched verifier');
        throw new Error('Twitter authorization expired. Please try linking again quickly after clicking the button.');
      }
      
      if (error.message?.includes('Invalid OAuth 2.0 credentials')) {
        console.error('Invalid OAuth credentials - check redirect URI or client config');
        throw new Error('Twitter OAuth configuration error. Please contact support.');
      }
      
      throw error;
    }
  }

  // Get all wallets linked to a Twitter account
  async getLinkedWallets(twitterId) {
    const result = await db.query(
      `SELECT wtl.wallet_address, wtl.linked_at, wtl.is_primary_wallet,
              u.username, us.total_predictions, us.total_invested
       FROM wallet_twitter_links wtl
       JOIN users u ON wtl.wallet_address = u.wallet_address
       LEFT JOIN user_stats us ON wtl.wallet_address = us.wallet_address
       WHERE wtl.twitter_id = $1
       ORDER BY wtl.is_primary_wallet DESC, wtl.linked_at ASC`,
      [twitterId]
    );

    return result.rows;
  }

  // Get Twitter account by wallet address
  async getTwitterByWallet(walletAddress) {
    const result = await db.query(
      `SELECT ta.*, wtl.is_primary_wallet
       FROM wallet_twitter_links wtl
       JOIN twitter_accounts ta ON wtl.twitter_id = ta.twitter_id
       WHERE wtl.wallet_address = $1`,
      [walletAddress]
    );

    return result.rows[0] || null;
  }

  // Get aggregated stats for a Twitter account across all wallets
  async getAggregatedStats(twitterId) {
    const result = await db.query(
      'SELECT * FROM twitter_wallet_stats WHERE twitter_id = $1',
      [twitterId]
    );

    return result.rows[0] || null;
  }

  // Get user client from stored tokens (now uses twitter_id)
  async getUserClient(twitterIdOrWalletAddress) {
    let twitterId = twitterIdOrWalletAddress;
    
    // If it looks like a wallet address, get the twitter_id
    if (twitterIdOrWalletAddress.length === 44) {
      const twitter = await this.getTwitterByWallet(twitterIdOrWalletAddress);
      if (!twitter) {
        throw new Error('Twitter account not linked. Please link your Twitter account first.');
      }
      twitterId = twitter.twitter_id;
    }

    const result = await db.query(
      'SELECT access_token, refresh_token, expires_at FROM twitter_oauth_tokens WHERE twitter_id = $1',
      [twitterId]
    );

    if (result.rows.length === 0) {
      throw new Error('Twitter account not properly linked. Please re-link your Twitter account.');
    }

    const { access_token, refresh_token, expires_at } = result.rows[0];
    
    // Decrypt tokens
    let accessToken, refreshToken;
    try {
      accessToken = decrypt(access_token);
      refreshToken = decrypt(refresh_token);
    } catch (decryptError) {
      console.error('Token decryption failed:', decryptError);
      throw new Error('Twitter authentication expired. Please re-link your Twitter account.');
    }

    // Check if token needs refresh
    if (new Date() >= new Date(expires_at)) {
      try {
        return await this.refreshUserToken(twitterId, refreshToken);
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        throw new Error('Twitter authentication expired. Please re-link your Twitter account.');
      }
    }

    return new TwitterApi(accessToken);
  }

  // All other methods remain the same but updated to work with twitter_id
  async refreshUserToken(twitterId, refreshToken) {
    try {
      const { client: refreshedClient, accessToken, refreshToken: newRefreshToken } = 
        await this.appClient.refreshOAuth2Token(refreshToken);

      // Update stored tokens
      const encryptedAccess = encrypt(accessToken);
      const encryptedRefresh = encrypt(newRefreshToken);

      await db.query(
        `UPDATE twitter_oauth_tokens 
         SET access_token = $1, refresh_token = $2, expires_at = NOW() + INTERVAL '2 hours', updated_at = NOW()
         WHERE twitter_id = $3`,
        [encryptedAccess, encryptedRefresh, twitterId]
      );

      return refreshedClient;
    } catch (error) {
      console.error('Token refresh error:', error);
      throw error;
    }
  }

  // Other methods (verifyFollowing, fetchPrimapeTweets, etc.) remain the same
  // but should be updated to work with twitter_id instead of wallet_address

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

      const isFollowing = following.data?.some(account => account.id === this.primapeAccountId) || false;

      if (isFollowing) {
        // Get twitter account for this wallet
        const twitterAccount = await this.getTwitterByWallet(walletAddress);
        if (!twitterAccount) {
          throw new Error('No Twitter account linked');
        }

        // Check if already awarded
        const existing = await db.query(
          `SELECT id FROM twitter_engagements 
           WHERE twitter_id = $1 AND engagement_type = 'follow' AND tweet_id = $2`,
          [twitterAccount.twitter_id, this.primapeAccountId]
        );

        if (existing.rows.length === 0) {
          // Award points for following
          await db.query(
            `INSERT INTO twitter_engagements (user_address, twitter_id, tweet_id, engagement_type, points_awarded)
             VALUES ($1, $2, $3, 'follow', 50)`,
            [walletAddress, twitterAccount.twitter_id, this.primapeAccountId]
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
      if (tweets.data?.data) {
        for (const tweet of tweets.data.data) {
          const mediaUrls = [];
          if (tweet.attachments && tweets.includes?.media) {
            tweet.attachments.media_keys?.forEach(key => {
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
      }

      return tweets.data?.data || [];
    } catch (error) {
      console.error('Error fetching Primape tweets:', error);
      // Return empty array instead of throwing to prevent UI issues
      return [];
    }
  }

  // Validate user engagement (like, retweet, comment)
  async validateEngagement(walletAddress, tweetId, engagementType) {
    try {
      const userClient = await this.getUserClient(walletAddress);
      const { data: user } = await userClient.v2.me();
      
      // Get twitter account for this wallet
      const twitterAccount = await this.getTwitterByWallet(walletAddress);
      if (!twitterAccount) {
        throw new Error('No Twitter account linked');
      }

      let isValid = false;
      let points = 0;

      switch (engagementType) {
        case 'like':
          const likedTweets = await userClient.v2.userLikedTweets(user.id, {
            max_results: 100,
            'tweet.fields': 'id',
          });
          isValid = likedTweets.data?.some(tweet => tweet.id === tweetId) || false;
          points = 5;
          break;

        case 'repost':
          const userTweets = await userClient.v2.userTimeline(user.id, {
            max_results: 100,
            'tweet.fields': 'referenced_tweets',
          });
          isValid = userTweets.data?.data?.some(tweet => 
            tweet.referenced_tweets?.some(ref => 
              ref.type === 'retweeted' && ref.id === tweetId
            )
          ) || false;
          points = 10;
          break;

        case 'comment':
          const replies = await userClient.v2.search(`conversation_id:${tweetId} from:${user.username}`, {
            max_results: 10,
          });
          isValid = replies.data?.data && replies.data.data.length > 0;
          points = 15;
          break;
      }

      if (isValid) {
        // Check if already awarded
        const existing = await db.query(
          `SELECT id FROM twitter_engagements 
           WHERE twitter_id = $1 AND tweet_id = $2 AND engagement_type = $3`,
          [twitterAccount.twitter_id, tweetId, engagementType]
        );

        if (existing.rows.length === 0) {
          // Award points
          await db.query(
            `INSERT INTO twitter_engagements (user_address, twitter_id, tweet_id, engagement_type, points_awarded)
             VALUES ($1, $2, $3, $4, $5)`,
            [walletAddress, twitterAccount.twitter_id, tweetId, engagementType, points]
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
      // Get twitter account for this wallet
      const twitterAccount = await this.getTwitterByWallet(walletAddress);
      if (!twitterAccount) {
        return { summary: [], recent_engagements: [] };
      }

      // Get all Twitter engagements for this Twitter account
      const engagements = await db.query(
        `SELECT engagement_type, COUNT(*) as count, SUM(points_awarded) as total_points
         FROM twitter_engagements
         WHERE twitter_id = $1
         GROUP BY engagement_type`,
        [twitterAccount.twitter_id]
      );

      // Get recent tweets engaged with
      const recentTweets = await db.query(
        `SELECT DISTINCT te.tweet_id, pt.content, te.engagement_type, te.points_awarded, te.verified_at
         FROM twitter_engagements te
         JOIN primape_tweets pt ON te.tweet_id = pt.tweet_id
         WHERE te.twitter_id = $1
         ORDER BY te.verified_at DESC
         LIMIT 10`,
        [twitterAccount.twitter_id]
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
}

module.exports = new TwitterServiceV2(); 