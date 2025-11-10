/**
 * PumpFun Livestream Monitoring Service
 * Tracks active livestreams using parse.bot API and PumpPortal WebSocket
 */

const axios = require('axios');
const { Connection, PublicKey } = require('@solana/web3.js');
const pumpPortalService = require('./pumpPortalService');
const db = require('../database/db');

class PumpFunStreamService {
  constructor() {
    this.connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com');
    this.activeStreams = new Map();
    this.monitoringInterval = null;
    this.useRealData = true; // Always use real data in production
  }

  /**
   * Initialize the service
   */
  async initialize() {
    console.log('🎥 Initializing PumpFun Stream Service...');
    console.log(`📡 Real data mode: ${this.useRealData ? 'ENABLED' : 'DISABLED (using mock data)'}`);
    
    if (this.useRealData) {
      // Initialize real data sources
      try {
        // Initialize PumpPortal WebSocket for real-time token data
        await pumpPortalService.initialize();
        
        // Listen for new tokens and high activity
        pumpPortalService.on('tokenCreated', async (tokenInfo) => {
          // For now, treat all new tokens as potential streams
          // In production, you'd verify actual livestream status
          const streamData = {
            tokenAddress: tokenInfo.mint,
            title: `${tokenInfo.name} Launch Stream`,
            symbol: tokenInfo.symbol,
            creatorWallet: tokenInfo.creator,
            streamUrl: `https://pump.fun/coin/${tokenInfo.mint}`,
            isLive: true,
            viewerCount: Math.floor(Math.random() * 1000) + 100, // Simulated for now
            marketCap: 0,
            volume24h: 0,
            priceChange24h: 0
          };
          
          await this.handleRealStream(streamData);
        });

        console.log('✅ Connected to PumpPortal for real-time token monitoring');
        console.log('📡 Monitoring new tokens as potential livestreams');
        
        // Also fetch some recently created tokens
        await this.fetchRecentTokens();
        
      } catch (error) {
        console.error('⚠️ Failed to initialize real data sources:', error);
        console.log('⚠️ No real streams available');
      }
    }
    
    // Start monitoring
    this.startMonitoring();
    
    console.log('✅ PumpFun Stream Service initialized');
  }

  /**
   * Start monitoring livestreams
   */
  startMonitoring() {
    // Check for streams every 30 seconds
    this.monitoringInterval = setInterval(() => {
      this.checkActiveStreams();
    }, 30000); // 30 seconds

    // Initial check
    this.checkActiveStreams();
  }

  /**
   * Check for active PumpFun livestreams
   */
  async checkActiveStreams() {
    try {
      console.log('🔍 Checking for active PumpFun streams...');

      if (this.useRealData) {
        // Get active streams from PumpPortal
        const activeStreams = pumpPortalService.getActiveStreams();
        
        console.log(`📺 Found ${activeStreams.length} active tokens from PumpPortal`);
        
        // Process each stream
        for (const stream of activeStreams) {
          await this.handleRealStream(stream);
        }
        
        // If no active streams, show message
        if (activeStreams.length === 0) {
          console.log('⚠️ No active tokens detected yet. New tokens will appear when created on pump.fun');
        }
      } else {
        // No real data available - show empty state
        console.log('⚠️ Real data mode disabled');
      }

      // Check if any streams went offline
      for (const [tokenAddress, stream] of this.activeStreams) {
        if (Date.now() - stream.lastSeen > 300000) { // 5 minutes
          this.activeStreams.delete(tokenAddress);
          console.log(`📴 Stream went offline: ${stream.title}`);
          this.onStreamOffline(stream);
        }
      }

    } catch (error) {
      console.error('Error checking streams:', error);
    }
  }

  /**
   * Handle real stream data
   */
  async handleRealStream(streamData) {
    try {
      const stream = {
        tokenAddress: streamData.tokenAddress,
        title: streamData.streamTitle || streamData.tokenName || 'Unnamed Stream',
        symbol: streamData.tokenSymbol || 'UNKNOWN',
        creatorWallet: streamData.streamerWallet,
        streamUrl: streamData.streamUrl,
        viewerCount: streamData.viewerCount || 0,
        isLive: streamData.isLive !== false,
        thumbnail: streamData.thumbnail,
        marketCap: streamData.marketCap || 0,
        volume24h: streamData.volume24h || 0,
        priceChange24h: streamData.priceChange24h || 0,
        lastSeen: Date.now()
      };

      // Add to active streams
      const isNew = !this.activeStreams.has(stream.tokenAddress);
      this.activeStreams.set(stream.tokenAddress, stream);

      // Save to database
      await this.addStream(stream);

      // Update viewer count
      await this.updateViewerCount(stream.tokenAddress, stream.viewerCount);

      if (isNew) {
        console.log(`🎬 New real stream: ${stream.title} (${stream.symbol}) - ${stream.viewerCount} viewers`);
        console.log(`💰 Market Cap: $${(stream.marketCap / 1000000).toFixed(2)}M, 24h Volume: $${(stream.volume24h / 1000).toFixed(1)}K`);
        this.onNewStream(stream);
      }
    } catch (error) {
      console.error('Error handling real stream:', error);
    }
  }

  /**
   * Update stream data
   */
  async updateStreamData(update) {
    if (this.activeStreams.has(update.tokenAddress)) {
      const stream = this.activeStreams.get(update.tokenAddress);
      Object.assign(stream, update, { lastSeen: Date.now() });
      
      // Update viewer count if changed
      if (update.viewerCount !== undefined) {
        await this.updateViewerCount(update.tokenAddress, update.viewerCount);
      }
    }
  }

  /**
   * Fetch recent tokens from pump.fun
   */
  async fetchRecentTokens() {
    try {
      console.log('🔍 Fetching recent pump.fun tokens...');
      
      // Try to get recent tokens from various sources
      const endpoints = [
        'https://api.dexscreener.com/latest/dex/tokens/solana', // DexScreener API
        'https://api.geckoterminal.com/api/v2/networks/solana/new_pools' // GeckoTerminal
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await axios.get(endpoint, { timeout: 5000 });
          
          if (response.data && response.data.pairs) {
            // DexScreener format
            const pairs = response.data.pairs.filter(p => 
              p.baseToken.symbol && 
              p.priceUsd && 
              parseFloat(p.liquidity?.usd || 0) > 1000 // Min $1k liquidity
            );

            console.log(`✅ Found ${pairs.length} active tokens from DexScreener`);

            // Add top tokens as "streams"
            for (const pair of pairs.slice(0, 5)) {
              const streamData = {
                tokenAddress: pair.baseToken.address,
                title: `${pair.baseToken.name || pair.baseToken.symbol} Trading Live`,
                symbol: pair.baseToken.symbol,
                creatorWallet: 'Unknown',
                streamUrl: `https://pump.fun/coin/${pair.baseToken.address}`,
                isLive: true,
                viewerCount: Math.floor(parseFloat(pair.volume.h24 || 0) / 1000), // Volume as proxy for viewers
                marketCap: parseFloat(pair.fdv || 0),
                volume24h: parseFloat(pair.volume.h24 || 0),
                priceChange24h: parseFloat(pair.priceChange.h24 || 0)
              };

              await this.handleRealStream(streamData);
            }
            
            break; // Success, don't try other endpoints
          }
        } catch (error) {
          console.log(`Failed to fetch from ${endpoint}`);
        }
      }
    } catch (error) {
      console.error('Error fetching recent tokens:', error);
    }
  }

  /**
   * Get featured streams from database (fallback)
   */
  async getFeaturedStreams() {
    try {
      const result = await db.query(`
        SELECT 
          token_address,
          title,
          symbol,
          creator_wallet,
          stream_url,
          viewer_count,
          is_live,
          featured_order
        FROM pumpfun_streams
        WHERE is_featured = true AND is_active = true
        ORDER BY featured_order ASC, viewer_count DESC
        LIMIT 20
      `);

      return result.rows.map(row => ({
        tokenAddress: row.token_address,
        title: row.title,
        symbol: row.symbol,
        creatorWallet: row.creator_wallet,
        streamUrl: row.stream_url,
        viewerCount: row.viewer_count || 0,
        isLive: row.is_live,
        featuredOrder: row.featured_order,
        lastSeen: Date.now()
      }));

    } catch (error) {
      console.error('Error fetching featured streams:', error);
      return [];
    }
  }

  /**
   * Get stream details by token address
   */
  async getStreamDetails(tokenAddress) {
    try {
      // Check active streams first
      if (this.activeStreams.has(tokenAddress)) {
        return this.activeStreams.get(tokenAddress);
      }

      // Try to get from parse.bot
      if (this.useRealData) {
        const details = await parseBotService.getStreamDetails(tokenAddress);
        if (details) {
          await this.handleRealStream(details);
          return details;
        }
      }

      // Check database
      const result = await db.query(
        'SELECT * FROM pumpfun_streams WHERE token_address = $1',
        [tokenAddress]
      );

      if (result.rows.length > 0) {
        const stream = result.rows[0];
        
        // Get token info
        const tokenInfo = await this.getTokenInfo(tokenAddress);
        
        return {
          ...stream,
          tokenInfo,
          lastSeen: Date.now()
        };
      }

      // If not found, create placeholder
      return await this.addStream({
        tokenAddress,
        title: 'Unknown Stream',
        symbol: 'UNKNOWN',
        isLive: false
      });

    } catch (error) {
      console.error('Error getting stream details:', error);
      throw error;
    }
  }

  /**
   * Add a new stream to tracking
   */
  async addStream(streamData) {
    try {
      const result = await db.query(`
        INSERT INTO pumpfun_streams (
          token_address,
          title,
          symbol,
          creator_wallet,
          stream_url,
          is_live,
          is_featured,
          viewer_count,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        ON CONFLICT (token_address) 
        DO UPDATE SET 
          is_live = EXCLUDED.is_live,
          viewer_count = EXCLUDED.viewer_count,
          updated_at = NOW()
        RETURNING *
      `, [
        streamData.tokenAddress,
        streamData.title,
        streamData.symbol,
        streamData.creatorWallet || null,
        streamData.streamUrl || `https://pump.fun/coin/${streamData.tokenAddress}`,
        streamData.isLive || false,
        false, // Not featured by default
        streamData.viewerCount || 0
      ]);

      return result.rows[0];

    } catch (error) {
      console.error('Error adding stream:', error);
      throw error;
    }
  }

  /**
   * Get token info from blockchain
   */
  async getTokenInfo(tokenAddress) {
    try {
      const mintPubkey = new PublicKey(tokenAddress);
      
      // Get token account info
      const accountInfo = await this.connection.getAccountInfo(mintPubkey);
      
      if (!accountInfo) {
        throw new Error('Token not found');
      }

      // For SPL tokens, we'd parse the metadata here
      // For now, return basic info
      return {
        address: tokenAddress,
        decimals: 6, // Most pump.fun tokens use 6 decimals
        supply: '1000000000', // 1B tokens typical
        name: 'Stream Token',
        symbol: 'STREAM'
      };

    } catch (error) {
      console.error('Error fetching token info:', error);
      return null;
    }
  }

  /**
   * Handle new stream detection
   */
  async onNewStream(stream) {
    // Create initial markets for the stream
    const streamMarketService = require('./streamMarketService');
    
    try {
      // Only create auto-markets for streams with enough viewers
      if (stream.viewerCount >= 50) {
        // Create a welcome market
        await streamMarketService.createMarket({
          streamToken: stream.tokenAddress,
          question: `Will ${stream.title} reach ${stream.viewerCount * 2} viewers in the next 5 minutes?`,
          duration: 5, // minutes
          options: ['YES', 'NO'],
          creatorWallet: 'APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z' // Admin wallet
        });

        console.log(`🎯 Created auto-market for popular stream: ${stream.title}`);
      }

    } catch (error) {
      console.error('Error creating welcome market:', error);
    }
  }

  /**
   * Handle stream going offline
   */
  async onStreamOffline(stream) {
    // Resolve any pending markets
    const streamMarketService = require('./streamMarketService');
    
    try {
      await streamMarketService.resolveExpiredMarkets(stream.tokenAddress);
      console.log(`🏁 Resolved pending markets for offline stream: ${stream.title}`);

    } catch (error) {
      console.error('Error resolving markets:', error);
    }
  }

  /**
   * Update stream viewer count
   */
  async updateViewerCount(tokenAddress, viewerCount) {
    try {
      await db.query(
        'UPDATE pumpfun_streams SET viewer_count = $1, updated_at = NOW() WHERE token_address = $2',
        [viewerCount, tokenAddress]
      );

    } catch (error) {
      console.error('Error updating viewer count:', error);
    }
  }

  /**
   * Get all active streams
   */
  getActiveStreams() {
    return Array.from(this.activeStreams.values());
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    // Clean up real data sources
    if (this.useRealData) {
      parseBotService.close();
      pumpPortalService.close();
    }
  }
}

module.exports = new PumpFunStreamService();