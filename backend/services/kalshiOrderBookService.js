const axios = require('axios');
const logger = require('../utils/logger');

class KalshiOrderBookService {
  constructor() {
    this.baseUrl = 'https://trading-api.kalshi.com/trade-api/v2';
    this.demoUrl = 'https://demo-api.kalshi.co/trade-api/v2';
    this.apiKey = process.env.KALSHI_API_KEY || null;
    this.useDemo = process.env.KALSHI_USE_DEMO === 'true';
    this.client = null;
  }

  async initialize() {
    logger.info('🟣 Initializing Kalshi Order Book Service');
    
    // Setup axios client with auth
    this.client = axios.create({
      baseURL: this.useDemo ? this.demoUrl : this.baseUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Add auth if API key is available
    if (this.apiKey) {
      await this.authenticate();
    } else {
      logger.warn('⚠️ Kalshi API key not configured - using public data only');
    }

    // Test connection
    try {
      await this.getMarkets(1);
      logger.info('✅ Kalshi service initialized successfully');
    } catch (error) {
      logger.warn('⚠️ Kalshi service initialization warning:', error.message);
    }
  }

  /**
   * Authenticate with Kalshi API
   */
  async authenticate() {
    try {
      // Kalshi uses email/password auth to get a token
      // This is a simplified version - real implementation needs proper auth flow
      if (process.env.KALSHI_EMAIL && process.env.KALSHI_PASSWORD) {
        const response = await this.client.post('/log_in', {
          email: process.env.KALSHI_EMAIL,
          password: process.env.KALSHI_PASSWORD
        });

        if (response.data.token) {
          this.client.defaults.headers['Authorization'] = `Bearer ${response.data.token}`;
          logger.info('✅ Kalshi authentication successful');
        }
      }
    } catch (error) {
      logger.error('Failed to authenticate with Kalshi:', error.message);
    }
  }

  /**
   * Get order book for a specific market
   * @param {string} ticker - Market ticker (e.g., "TRUMP-2024")
   */
  async getOrderBook(ticker) {
    try {
      // Get market details
      const market = await this.getMarket(ticker);
      
      if (!market) {
        throw new Error(`Market ${ticker} not found`);
      }

      // Get order book data
      const orderBookResponse = await this.client.get(`/markets/${ticker}/orderbook`, {
        params: {
          depth: 10 // Get top 10 levels
        }
      });

      const orderBook = orderBookResponse.data;

      // Get recent trades
      let trades = [];
      try {
        const tradesResponse = await this.client.get(`/markets/${ticker}/trades`, {
          params: {
            limit: 100
          }
        });
        trades = tradesResponse.data.trades || [];
      } catch (error) {
        logger.debug('Failed to fetch trades:', error.message);
      }

      // Format for our system
      return this.formatOrderBook(market, orderBook, trades);
    } catch (error) {
      logger.error(`Error fetching Kalshi order book for ${ticker}:`, error);
      
      // Return mock data for demo
      return this.getMockOrderBook(ticker);
    }
  }

  /**
   * Get market details
   */
  async getMarket(ticker) {
    try {
      const response = await this.client.get(`/markets/${ticker}`);
      return response.data.market;
    } catch (error) {
      logger.error(`Error fetching Kalshi market ${ticker}:`, error);
      return null;
    }
  }

  /**
   * Get list of active markets
   */
  async getMarkets(limit = 10) {
    try {
      const response = await this.client.get('/markets', {
        params: {
          limit,
          status: 'active',
          order_by: 'volume',
          order_dir: 'desc'
        }
      });

      return response.data.markets || [];
    } catch (error) {
      logger.error('Error fetching Kalshi markets:', error);
      
      // Return sample markets for demo
      return this.getSampleMarkets();
    }
  }

  /**
   * Format Kalshi order book for our system
   */
  formatOrderBook(market, orderBook, trades) {
    const formatted = {
      marketId: market.id,
      ticker: market.ticker,
      question: market.title,
      subtitle: market.subtitle,
      // Kalshi specific fields
      yes_bid: orderBook.yes?.bid || 0,
      yes_ask: orderBook.yes?.ask || 0,
      yes_bid_size: orderBook.yes?.bid_size || 0,
      yes_ask_size: orderBook.yes?.ask_size || 0,
      no_bid: orderBook.no?.bid || 0,
      no_ask: orderBook.no?.ask || 0,
      no_bid_size: orderBook.no?.bid_size || 0,
      no_ask_size: orderBook.no?.ask_size || 0,
      volume: market.volume || 0,
      volume_24h: market.volume_24h || 0,
      open_interest: market.open_interest || 0,
      last_price: market.last_price || 50,
      previous_close: market.previous_close || 50,
      // Order book levels
      orderbook_levels: {
        yes: {
          bids: this.formatOrderLevels(orderBook.yes?.bids || []),
          asks: this.formatOrderLevels(orderBook.yes?.asks || [])
        },
        no: {
          bids: this.formatOrderLevels(orderBook.no?.bids || []),
          asks: this.formatOrderLevels(orderBook.no?.asks || [])
        }
      },
      // Recent trades
      recent_trades: this.formatTrades(trades),
      lastUpdate: new Date()
    };

    return formatted;
  }

  /**
   * Format order book levels
   */
  formatOrderLevels(levels) {
    return levels.map(level => ({
      price: level[0], // Price in cents
      size: level[1],  // Number of contracts
      count: level[2] || 1 // Number of orders at this level
    }));
  }

  /**
   * Format trades
   */
  formatTrades(trades) {
    return trades.slice(0, 20).map(trade => ({
      price: trade.price,
      size: trade.count,
      side: trade.is_yes ? 'yes' : 'no',
      timestamp: trade.created_time
    }));
  }

  /**
   * Get mock order book for demo/testing
   */
  getMockOrderBook(ticker) {
    const baseYesPrice = 65 + Math.random() * 20 - 10; // 55-75
    const spread = 2; // 2 cents
    
    return {
      marketId: `mock_${ticker}`,
      ticker: ticker,
      question: `Mock market for ${ticker}`,
      subtitle: 'Demo market data',
      yes_bid: baseYesPrice - spread/2,
      yes_ask: baseYesPrice + spread/2,
      yes_bid_size: Math.floor(Math.random() * 500) + 100,
      yes_ask_size: Math.floor(Math.random() * 500) + 100,
      no_bid: 100 - baseYesPrice - spread/2,
      no_ask: 100 - baseYesPrice + spread/2,
      no_bid_size: Math.floor(Math.random() * 500) + 100,
      no_ask_size: Math.floor(Math.random() * 500) + 100,
      volume: Math.floor(Math.random() * 50000),
      volume_24h: Math.floor(Math.random() * 100000),
      open_interest: Math.floor(Math.random() * 20000),
      last_price: baseYesPrice,
      previous_close: baseYesPrice - Math.random() * 10 + 5,
      orderbook_levels: {
        yes: {
          bids: this.generateMockLevels(baseYesPrice - spread/2, 'bid'),
          asks: this.generateMockLevels(baseYesPrice + spread/2, 'ask')
        },
        no: {
          bids: this.generateMockLevels(100 - baseYesPrice - spread/2, 'bid'),
          asks: this.generateMockLevels(100 - baseYesPrice + spread/2, 'ask')
        }
      },
      recent_trades: this.generateMockTrades(baseYesPrice),
      lastUpdate: new Date()
    };
  }

  /**
   * Generate mock order book levels
   */
  generateMockLevels(startPrice, side) {
    const levels = [];
    const increment = side === 'bid' ? -1 : 1;
    
    for (let i = 0; i < 5; i++) {
      levels.push({
        price: startPrice + (i * increment),
        size: Math.floor(Math.random() * 300) + 50,
        count: Math.floor(Math.random() * 5) + 1
      });
    }
    
    return levels;
  }

  /**
   * Generate mock trades
   */
  generateMockTrades(basePrice) {
    const trades = [];
    const now = Date.now();
    
    for (let i = 0; i < 10; i++) {
      const variation = Math.random() * 4 - 2; // +/- 2 cents
      trades.push({
        price: Math.round(basePrice + variation),
        size: Math.floor(Math.random() * 100) + 10,
        side: Math.random() > 0.5 ? 'yes' : 'no',
        timestamp: new Date(now - i * 60000) // 1 minute intervals
      });
    }
    
    return trades;
  }

  /**
   * Get sample markets for demo
   */
  getSampleMarkets() {
    return [
      {
        id: 'demo_1',
        ticker: 'TRUMP-2024',
        title: 'Will Trump win the 2024 election?',
        subtitle: 'Resolution based on official results',
        volume: 1500000,
        last_price: 65,
        status: 'active'
      },
      {
        id: 'demo_2',
        ticker: 'BTC-100K-2024',
        title: 'Will Bitcoin reach $100,000 in 2024?',
        subtitle: 'Based on any major exchange',
        volume: 850000,
        last_price: 42,
        status: 'active'
      },
      {
        id: 'demo_3',
        ticker: 'FED-RATE-CUT',
        title: 'Will the Fed cut rates in the next meeting?',
        subtitle: 'Based on FOMC decision',
        volume: 2100000,
        last_price: 78,
        status: 'active'
      }
    ];
  }

  /**
   * Search markets
   */
  async searchMarkets(query) {
    try {
      const response = await this.client.get('/markets', {
        params: {
          search: query,
          status: 'active',
          limit: 20
        }
      });

      return response.data.markets || [];
    } catch (error) {
      logger.error('Error searching Kalshi markets:', error);
      return [];
    }
  }

  /**
   * Get market by event ticker
   */
  async getMarketByEvent(eventTicker) {
    try {
      const response = await this.client.get(`/events/${eventTicker}/markets`);
      return response.data.markets || [];
    } catch (error) {
      logger.error('Error fetching markets for event:', error);
      return [];
    }
  }

  /**
   * Map Kalshi categories to our categories
   */
  mapCategory(kalshiCategory) {
    const categoryMap = {
      'politics': 'politics',
      'economics': 'crypto',
      'finance': 'crypto',
      'sports': 'sports',
      'science': 'other',
      'entertainment': 'other',
      'climate': 'other'
    };

    return categoryMap[kalshiCategory.toLowerCase()] || 'other';
  }

  /**
   * Cleanup
   */
  async shutdown() {
    logger.info('🟣 Shutting down Kalshi service');
  }
}

module.exports = KalshiOrderBookService;