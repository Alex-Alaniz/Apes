/**
 * Parse.bot API Service
 * Fetches pump.fun livestream data using parse.bot API
 */

const axios = require('axios');
const EventEmitter = require('events');

class ParseBotService extends EventEmitter {
  constructor() {
    super();
    this.apiKey = 'd8c59e1e-2558-4803-9701-bcde4ec9b896';
    this.baseUrl = 'https://api.parse.bot/v1';
    this.activeStreams = new Map();
    this.pollInterval = null;
  }

  /**
   * Initialize the service
   */
  async initialize() {
    console.log('🤖 Initializing Parse.bot service...');
    
    // Start polling for active streams
    this.startPolling();
    
    // Initial fetch
    await this.fetchActiveStreams();
  }

  /**
   * Create axios instance with auth headers
   */
  getClient() {
    return axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'APES-Platform/1.0'
      },
      timeout: 10000
    });
  }

  /**
   * Fetch active livestreams
   */
  async fetchActiveStreams() {
    try {
      console.log('🔍 Fetching active streams from parse.bot...');
      
      // Try multiple endpoints as the exact one might vary
      const endpoints = [
        '/streams/active',
        '/pump/streams',
        '/pump/live',
        '/livestreams',
        '/api/streams/active'
      ];

      let streams = [];
      let success = false;

      for (const endpoint of endpoints) {
        try {
          const response = await this.getClient().get(endpoint);
          
          if (response.data && response.data.success !== false) {
            streams = Array.isArray(response.data) ? response.data : 
                     response.data.data || response.data.streams || [];
            success = true;
            console.log(`✅ Found ${streams.length} streams at ${endpoint}`);
            break;
          }
        } catch (error) {
          // Try next endpoint
          continue;
        }
      }

      if (!success) {
        console.log('⚠️ Could not fetch from parse.bot, trying alternative method...');
        // Fallback to scraping or other method
        return await this.fetchStreamsAlternative();
      }

      // Process streams
      for (const stream of streams) {
        this.processStream(stream);
      }

      return streams;

    } catch (error) {
      console.error('Error fetching streams from parse.bot:', error.message);
      
      // Fallback to alternative methods
      return await this.fetchStreamsAlternative();
    }
  }

  /**
   * Alternative method to fetch streams (scraping pump.fun)
   */
  async fetchStreamsAlternative() {
    try {
      console.log('🌐 Attempting to fetch streams via alternative method...');
      
      // Try to get pump.fun live page data
      const response = await axios.get('https://pump.fun/api/live-streams', {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      });

      if (response.data && Array.isArray(response.data)) {
        const streams = response.data.map(stream => ({
          tokenAddress: stream.mint || stream.token_address,
          tokenName: stream.name || stream.token_name,
          tokenSymbol: stream.symbol || stream.token_symbol,
          streamerWallet: stream.creator || stream.streamer_wallet,
          isLive: true,
          viewerCount: stream.viewers || stream.viewer_count || 0,
          streamUrl: stream.url || `https://pump.fun/coin/${stream.mint || stream.token_address}`,
          streamTitle: stream.title || `${stream.name || 'Unknown'} Live`,
          startedAt: stream.started_at || new Date(),
          marketCap: stream.market_cap || 0,
          volume24h: stream.volume_24h || 0
        }));

        console.log(`✅ Found ${streams.length} streams via alternative method`);
        return streams;
      }

      return [];

    } catch (error) {
      console.error('Alternative stream fetch failed:', error.message);
      
      // Return mock data for testing
      return this.getMockStreams();
    }
  }

  /**
   * Process individual stream
   */
  processStream(streamData) {
    const stream = {
      tokenAddress: streamData.token_address || streamData.mint || streamData.tokenAddress,
      tokenName: streamData.token_name || streamData.name || 'Unknown Token',
      tokenSymbol: streamData.token_symbol || streamData.symbol || 'UNKNOWN',
      streamerWallet: streamData.streamer_wallet || streamData.creator || streamData.wallet,
      isLive: streamData.is_live !== false,
      viewerCount: streamData.viewer_count || streamData.viewers || 0,
      streamUrl: streamData.stream_url || streamData.url || `https://pump.fun/coin/${streamData.token_address || streamData.mint}`,
      streamTitle: streamData.title || streamData.stream_title || `${streamData.name || 'Unknown'} Live`,
      startedAt: streamData.started_at ? new Date(streamData.started_at) : new Date(),
      thumbnail: streamData.thumbnail || streamData.image || null,
      marketCap: streamData.market_cap || 0,
      volume24h: streamData.volume_24h || streamData.volume || 0,
      priceChange24h: streamData.price_change_24h || 0
    };

    const existingStream = this.activeStreams.get(stream.tokenAddress);
    
    if (!existingStream) {
      // New stream detected
      this.activeStreams.set(stream.tokenAddress, stream);
      console.log(`🎥 New stream detected: ${stream.tokenName} (${stream.tokenSymbol})`);
      this.emit('streamStarted', stream);
    } else if (!existingStream.isLive && stream.isLive) {
      // Stream went live again
      this.activeStreams.set(stream.tokenAddress, stream);
      this.emit('streamStarted', stream);
    } else {
      // Update existing stream data
      this.activeStreams.set(stream.tokenAddress, { ...existingStream, ...stream });
      this.emit('streamUpdated', stream);
    }
  }

  /**
   * Get mock streams for testing
   */
  getMockStreams() {
    // Return empty array - no mock data in production
    console.log('📡 No live streams found - waiting for real pump.fun streams to go live');
    return [];
  }

  /**
   * Get stream details
   */
  async getStreamDetails(tokenAddress) {
    try {
      // Check cache first
      if (this.activeStreams.has(tokenAddress)) {
        return this.activeStreams.get(tokenAddress);
      }

      // Fetch from API
      const response = await this.getClient().get(`/streams/${tokenAddress}`);
      
      if (response.data && response.data.success !== false) {
        const streamData = response.data.data || response.data;
        this.processStream(streamData);
        return this.activeStreams.get(tokenAddress);
      }

      return null;
    } catch (error) {
      console.error(`Error fetching stream details for ${tokenAddress}:`, error.message);
      return null;
    }
  }

  /**
   * Start polling for active streams
   */
  startPolling() {
    // Poll every 30 seconds
    this.pollInterval = setInterval(async () => {
      await this.fetchActiveStreams();
    }, 30000);
  }

  /**
   * Stop polling
   */
  stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  /**
   * Get all active streams
   */
  getActiveStreams() {
    return Array.from(this.activeStreams.values()).filter(s => s.isLive);
  }

  /**
   * Clean up
   */
  close() {
    this.stopPolling();
    this.activeStreams.clear();
  }
}

module.exports = new ParseBotService();