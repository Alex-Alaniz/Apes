/**
 * Stream Market Service
 * Creates and manages 5-minute prediction markets for livestreams
 */

const { Connection, PublicKey, Keypair, Transaction, sendAndConfirmTransaction } = require('@solana/web3.js');
const { Program, web3, BN } = require('@coral-xyz/anchor');
const { TOKEN_PROGRAM_ID } = require('@solana/spl-token');

class StreamMarketService {
  constructor() {
    this.connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com');
    this.markets = new Map(); // Active stream markets
    this.marketCheckInterval = null;
  }

  /**
   * Initialize the service
   */
  async initialize() {
    console.log('🎲 Initializing Stream Market Service...');
    
    // Start checking for expired markets
    this.startMarketMonitoring();
    
    // Load active markets from database
    await this.loadActiveMarkets();
    
    console.log('✅ Stream Market Service initialized');
  }

  /**
   * Start monitoring markets for expiration
   */
  startMarketMonitoring() {
    // Check every 30 seconds for expired markets
    this.marketCheckInterval = setInterval(() => {
      this.checkExpiredMarkets();
    }, 30000); // 30 seconds
  }

  /**
   * Create a new 5-minute market for a stream
   */
  async createMarket(params) {
    const {
      streamToken,
      question,
      duration = 5, // minutes
      options = ['YES', 'NO'],
      creatorWallet = null
    } = params;

    const db = require('../database/db');

    try {
      // Calculate expiration time
      const expiresAt = new Date(Date.now() + duration * 60 * 1000);

      // Create market in database
      const result = await db.query(`
        INSERT INTO stream_markets (
          stream_token,
          question,
          options,
          duration_minutes,
          creator_wallet,
          created_at,
          expires_at,
          status,
          platform_fee_bps,
          creator_fee_bps,
          streamer_fee_bps
        ) VALUES ($1, $2, $3, $4, $5, NOW(), $6, 'active', $7, $8, $9)
        RETURNING *
      `, [
        streamToken,
        question,
        JSON.stringify(options),
        duration,
        creatorWallet,
        expiresAt,
        200, // 2% platform fee
        50,  // 0.5% creator fee
        50   // 0.5% streamer fee
      ]);

      const market = result.rows[0];

      // Add to active markets
      this.markets.set(market.id, {
        ...market,
        totalVolume: 0,
        optionVolumes: options.map(() => 0)
      });

      console.log(`🎯 Created stream market #${market.id}: "${question}"`);

      // Try to create on-chain market
      try {
        const onChainMarketService = require('./onChainMarketService');
        if (onChainMarketService.isReady()) {
          const onChainResult = await onChainMarketService.createMarket({
            question,
            options,
            duration,
            creatorStake: 10 // Lower stake for quick markets
          });

          if (onChainResult) {
            // Update database with on-chain address
            await db.query(
              'UPDATE stream_markets SET market_address = $1, tx_signature = $2 WHERE id = $3',
              [onChainResult.marketAddress, onChainResult.txSignature, market.id]
            );

            market.market_address = onChainResult.marketAddress;
            market.tx_signature = onChainResult.txSignature;

            console.log(`✅ Market deployed on-chain: ${onChainResult.marketAddress}`);
          } else {
            console.log('⚠️ Failed to create on-chain market, continuing with off-chain only');
          }
        } else {
          console.log('⚠️ On-chain service not ready, creating off-chain market only');
        }
      } catch (onChainError) {
        console.error('❌ Error creating on-chain market:', onChainError);
        // Continue with off-chain market only
      }

      return market;

    } catch (error) {
      console.error('Error creating stream market:', error);
      throw error;
    }
  }

  /**
   * Place a bet on a stream market
   */
  async placeBet(params) {
    const {
      marketId,
      userWallet,
      option,
      amount, // in SOL
      txSignature
    } = params;

    const db = require('../database/db');

    try {
      // Get market details
      const marketResult = await db.query(
        'SELECT * FROM stream_markets WHERE id = $1 AND status = $2',
        [marketId, 'active']
      );

      if (marketResult.rows.length === 0) {
        throw new Error('Market not found or not active');
      }

      const market = marketResult.rows[0];

      // Check if market is expired
      if (new Date(market.expires_at) < new Date()) {
        throw new Error('Market has expired');
      }

      // Record bet in database
      const betResult = await db.query(`
        INSERT INTO stream_bets (
          market_id,
          user_wallet,
          option,
          amount,
          tx_signature,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING *
      `, [
        marketId,
        userWallet,
        option,
        amount,
        txSignature
      ]);

      // Update market volume
      await db.query(`
        UPDATE stream_markets 
        SET total_volume = total_volume + $1,
            option_volumes = jsonb_set(
              option_volumes, 
              '{${option}}', 
              to_jsonb((option_volumes->>${option})::numeric + $1)
            ),
            updated_at = NOW()
        WHERE id = $2
      `, [amount, marketId]);

      // Update in-memory market
      if (this.markets.has(marketId)) {
        const activeMarket = this.markets.get(marketId);
        activeMarket.totalVolume += parseFloat(amount);
        activeMarket.optionVolumes[option] += parseFloat(amount);
      }

      console.log(`💰 Bet placed: ${userWallet} bet ${amount} SOL on option ${option} for market #${marketId}`);

      return betResult.rows[0];

    } catch (error) {
      console.error('Error placing bet:', error);
      throw error;
    }
  }

  /**
   * Check for expired markets and resolve them
   */
  async checkExpiredMarkets() {
    const db = require('../database/db');

    try {
      // Find expired markets
      const expiredMarkets = await db.query(`
        SELECT * FROM stream_markets 
        WHERE status = 'active' 
        AND expires_at < NOW()
      `);

      for (const market of expiredMarkets.rows) {
        await this.autoResolveMarket(market);
      }

    } catch (error) {
      console.error('Error checking expired markets:', error);
    }
  }

  /**
   * Auto-resolve a market (can be overridden by admin)
   */
  async autoResolveMarket(market) {
    const db = require('../database/db');

    try {
      // For auto-resolution, we'll use random for now
      // In production, this would be based on actual stream data
      const winningOption = Math.random() > 0.5 ? 0 : 1;

      // Update market status
      await db.query(`
        UPDATE stream_markets 
        SET status = 'resolved',
            winning_option = $1,
            resolved_at = NOW()
        WHERE id = $2
      `, [winningOption, market.id]);

      // Calculate and distribute winnings
      await this.distributeWinnings(market.id, winningOption);

      // Remove from active markets
      this.markets.delete(market.id);

      console.log(`🏁 Auto-resolved market #${market.id} with winning option ${winningOption}`);

    } catch (error) {
      console.error('Error auto-resolving market:', error);
    }
  }

  /**
   * Distribute winnings to winners
   */
  async distributeWinnings(marketId, winningOption) {
    const db = require('../database/db');

    try {
      // Get all bets for this market
      const betsResult = await db.query(
        'SELECT * FROM stream_bets WHERE market_id = $1',
        [marketId]
      );

      const bets = betsResult.rows;
      
      // Calculate total pool and winning pool
      let totalPool = 0;
      let winningPool = 0;
      const winners = [];

      for (const bet of bets) {
        totalPool += parseFloat(bet.amount);
        if (bet.option === winningOption) {
          winningPool += parseFloat(bet.amount);
          winners.push(bet);
        }
      }

      if (winners.length === 0) {
        console.log(`No winners for market #${marketId}`);
        return;
      }

      // Get market details for fees
      const marketResult = await db.query(
        'SELECT * FROM stream_markets WHERE id = $1',
        [marketId]
      );
      const market = marketResult.rows[0];

      // Calculate fees
      const platformFee = totalPool * (market.platform_fee_bps / 10000);
      const creatorFee = totalPool * (market.creator_fee_bps / 10000);
      const streamerFee = totalPool * (market.streamer_fee_bps / 10000);
      const totalFees = platformFee + creatorFee + streamerFee;

      // Remaining pool after fees
      const prizePool = totalPool - totalFees;

      // Distribute winnings proportionally
      for (const winner of winners) {
        const winnerShare = parseFloat(winner.amount) / winningPool;
        const payout = prizePool * winnerShare;

        // Record payout
        await db.query(`
          INSERT INTO stream_payouts (
            market_id,
            user_wallet,
            bet_amount,
            payout_amount,
            created_at
          ) VALUES ($1, $2, $3, $4, NOW())
        `, [marketId, winner.user_wallet, winner.amount, payout]);

        console.log(`💸 Payout: ${winner.user_wallet} wins ${payout} SOL`);
      }

      // Record fee distributions
      await db.query(`
        UPDATE stream_markets 
        SET total_platform_fee = $1,
            total_creator_fee = $2,
            total_streamer_fee = $3
        WHERE id = $4
      `, [platformFee, creatorFee, streamerFee, marketId]);

    } catch (error) {
      console.error('Error distributing winnings:', error);
    }
  }

  /**
   * Load active markets from database
   */
  async loadActiveMarkets() {
    const db = require('../database/db');

    try {
      const result = await db.query(`
        SELECT * FROM stream_markets 
        WHERE status = 'active'
        ORDER BY created_at DESC
      `);

      for (const market of result.rows) {
        this.markets.set(market.id, market);
      }

      console.log(`📊 Loaded ${result.rows.length} active stream markets`);

    } catch (error) {
      console.error('Error loading active markets:', error);
    }
  }

  /**
   * Get markets for a specific stream
   */
  async getStreamMarkets(streamToken, status = 'active') {
    const db = require('../database/db');

    try {
      const result = await db.query(`
        SELECT 
          sm.*,
          COALESCE(SUM(sb.amount), 0) as total_volume,
          COUNT(DISTINCT sb.user_wallet) as unique_bettors,
          json_agg(
            json_build_object(
              'option', sb.option,
              'amount', sb.amount,
              'user', sb.user_wallet
            )
          ) FILTER (WHERE sb.id IS NOT NULL) as recent_bets
        FROM stream_markets sm
        LEFT JOIN stream_bets sb ON sm.id = sb.market_id
        WHERE sm.stream_token = $1 
        ${status ? 'AND sm.status = $2' : ''}
        GROUP BY sm.id
        ORDER BY sm.created_at DESC
        LIMIT 10
      `, status ? [streamToken, status] : [streamToken]);

      return result.rows;

    } catch (error) {
      console.error('Error fetching stream markets:', error);
      throw error;
    }
  }

  /**
   * Resolve expired markets for a specific stream
   */
  async resolveExpiredMarkets(streamToken) {
    const db = require('../database/db');

    try {
      const expiredMarkets = await db.query(`
        SELECT * FROM stream_markets 
        WHERE stream_token = $1 
        AND status = 'active' 
        AND expires_at < NOW()
      `, [streamToken]);

      for (const market of expiredMarkets.rows) {
        await this.autoResolveMarket(market);
      }

      return expiredMarkets.rows.length;

    } catch (error) {
      console.error('Error resolving expired markets:', error);
      throw error;
    }
  }

  /**
   * Get market statistics
   */
  async getMarketStats(marketId) {
    const db = require('../database/db');

    try {
      const result = await db.query(`
        SELECT 
          sm.*,
          COUNT(DISTINCT sb.user_wallet) as total_bettors,
          COALESCE(SUM(sb.amount), 0) as total_volume,
          json_object_agg(
            sb.option::text,
            COALESCE(option_stats.total, 0)
          ) as option_volumes,
          json_object_agg(
            sb.option::text,
            COALESCE(option_stats.count, 0)
          ) as option_bettors
        FROM stream_markets sm
        LEFT JOIN stream_bets sb ON sm.id = sb.market_id
        LEFT JOIN LATERAL (
          SELECT 
            option,
            SUM(amount) as total,
            COUNT(DISTINCT user_wallet) as count
          FROM stream_bets
          WHERE market_id = sm.id
          GROUP BY option
        ) option_stats ON true
        WHERE sm.id = $1
        GROUP BY sm.id
      `, [marketId]);

      return result.rows[0];

    } catch (error) {
      console.error('Error fetching market stats:', error);
      throw error;
    }
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.marketCheckInterval) {
      clearInterval(this.marketCheckInterval);
      this.marketCheckInterval = null;
    }
  }
}

module.exports = new StreamMarketService();