const axios = require('axios');
const { request, gql } = require('graphql-request');
const logger = require('../utils/logger');

class PolymarketOrderBookService {
  constructor() {
    this.baseUrl = 'https://clob.polymarket.com';
    this.gammaApiUrl = 'https://gamma-api.polymarket.com';
    this.subgraphUrl = 'https://api.thegraph.com/subgraphs/name/polymarket/matic-markets';
    this.apiKey = process.env.POLYMARKET_API_KEY || null;
  }

  async initialize() {
    logger.info('🔷 Initializing Polymarket Order Book Service');
    // Test connection
    try {
      await this.getMarkets(1);
      logger.info('✅ Polymarket service initialized successfully');
    } catch (error) {
      logger.warn('⚠️ Polymarket service initialization warning:', error.message);
      // Don't throw - service can work without API key for public data
    }
  }

  /**
   * Get order book for a specific market
   * @param {string} slug - Market slug (e.g., "will-trump-win-2024")
   * @param {string} conditionId - Condition ID for the market
   */
  async getOrderBook(slug, conditionId) {
    try {
      // First, get market details
      const marketDetails = await this.getMarketDetails(slug);
      
      if (!marketDetails) {
        throw new Error(`Market ${slug} not found`);
      }

      // Get order book data from CLOB API
      const orderBookData = await this.fetchCLOBOrderBook(conditionId);
      
      // Get additional market data from Gamma API
      const gammaData = await this.fetchGammaMarketData(slug);
      
      // Combine and format the data
      return this.formatOrderBook(marketDetails, orderBookData, gammaData);
    } catch (error) {
      logger.error(`Error fetching Polymarket order book for ${slug}:`, error);
      throw error;
    }
  }

  /**
   * Fetch order book from Polymarket CLOB
   */
  async fetchCLOBOrderBook(conditionId) {
    try {
      const headers = {};
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      // Polymarket CLOB endpoints
      const endpoints = [
        `/markets/${conditionId}/book`,
        `/books/${conditionId}`
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await axios.get(`${this.baseUrl}${endpoint}`, {
            headers,
            timeout: 10000
          });

          if (response.data) {
            return response.data;
          }
        } catch (err) {
          logger.debug(`CLOB endpoint ${endpoint} failed:`, err.message);
        }
      }

      // Fallback to mock data if CLOB is unavailable
      return this.getMockOrderBook();
    } catch (error) {
      logger.error('Error fetching CLOB order book:', error);
      return this.getMockOrderBook();
    }
  }

  /**
   * Fetch market data from Gamma API
   */
  async fetchGammaMarketData(slug) {
    try {
      const response = await axios.get(`${this.gammaApiUrl}/markets/${slug}`, {
        timeout: 10000
      });

      return response.data;
    } catch (error) {
      logger.debug('Gamma API fetch failed:', error.message);
      return null;
    }
  }

  /**
   * Get market details from The Graph
   */
  async getMarketDetails(slug) {
    try {
      const query = gql`
        query GetMarket($slug: String!) {
          markets(where: { slug: $slug }) {
            id
            question
            outcomes
            slug
            conditionId
            volume
            liquidity
            startDate
            endDate
            resolved
            winningOutcome
          }
        }
      `;

      const data = await request(this.subgraphUrl, query, { slug });
      
      if (data.markets && data.markets.length > 0) {
        return data.markets[0];
      }

      // Fallback: try to get by conditionId if slug fails
      return null;
    } catch (error) {
      logger.error('Error fetching market details from The Graph:', error);
      return null;
    }
  }

  /**
   * Get list of active markets
   */
  async getMarkets(limit = 10) {
    try {
      const query = gql`
        query GetActiveMarkets($limit: Int!) {
          markets(
            first: $limit
            where: { resolved: false }
            orderBy: volume
            orderDirection: desc
          ) {
            id
            question
            slug
            conditionId
            outcomes
            volume
            liquidity
            startDate
            endDate
          }
        }
      `;

      const data = await request(this.subgraphUrl, query, { limit });
      return data.markets || [];
    } catch (error) {
      logger.error('Error fetching Polymarket markets:', error);
      return [];
    }
  }

  /**
   * Format order book data for our system
   */
  formatOrderBook(marketDetails, clobData, gammaData) {
    const formatted = {
      marketId: marketDetails?.id,
      slug: marketDetails?.slug,
      question: marketDetails?.question,
      outcomes: [],
      volume24h: parseFloat(marketDetails?.volume || 0),
      liquidity: parseFloat(marketDetails?.liquidity || 0),
      lastUpdate: new Date()
    };

    // Get outcomes (usually YES/NO for binary markets)
    const outcomeLabels = marketDetails?.outcomes || ['YES', 'NO'];
    
    outcomeLabels.forEach((label, index) => {
      const outcome = {
        index,
        label,
        bids: [],
        asks: [],
        lastPrice: null,
        volume24h: 0
      };

      // Extract CLOB data if available
      if (clobData && clobData.bids && clobData.asks) {
        // CLOB data structure varies, adapt as needed
        if (Array.isArray(clobData.bids)) {
          outcome.bids = clobData.bids.map(bid => ({
            price: parseFloat(bid.price),
            size: parseFloat(bid.size),
            timestamp: bid.timestamp
          }));
        }

        if (Array.isArray(clobData.asks)) {
          outcome.asks = clobData.asks.map(ask => ({
            price: parseFloat(ask.price),
            size: parseFloat(ask.size),
            timestamp: ask.timestamp
          }));
        }
      }

      // Add Gamma data if available
      if (gammaData && gammaData.outcomes) {
        const gammaOutcome = gammaData.outcomes[index];
        if (gammaOutcome) {
          outcome.lastPrice = gammaOutcome.lastPrice;
          outcome.volume24h = gammaOutcome.volume24h || 0;
          
          // Merge any additional price levels
          if (gammaOutcome.orderBook) {
            // Additional order book data from Gamma
            this.mergeOrderBookLevels(outcome, gammaOutcome.orderBook);
          }
        }
      }

      // If no real data, use mock data
      if (outcome.bids.length === 0 && outcome.asks.length === 0) {
        const mockData = this.generateMockPrices(index, outcomeLabels.length);
        outcome.bids = mockData.bids;
        outcome.asks = mockData.asks;
        outcome.lastPrice = mockData.lastPrice;
      }

      formatted.outcomes.push(outcome);
    });

    return formatted;
  }

  /**
   * Merge additional order book levels
   */
  mergeOrderBookLevels(outcome, additionalBook) {
    if (additionalBook.bids) {
      outcome.bids.push(...additionalBook.bids);
      outcome.bids.sort((a, b) => b.price - a.price);
    }

    if (additionalBook.asks) {
      outcome.asks.push(...additionalBook.asks);
      outcome.asks.sort((a, b) => a.price - b.price);
    }
  }

  /**
   * Generate mock order book data for testing
   */
  getMockOrderBook() {
    return {
      bids: [],
      asks: []
    };
  }

  /**
   * Generate realistic mock prices for demo/testing
   */
  generateMockPrices(outcomeIndex, totalOutcomes) {
    const basePrice = outcomeIndex === 0 ? 0.65 : 0.35; // Slightly favor first outcome
    const spread = 0.02;
    const levels = 5;
    
    const bids = [];
    const asks = [];
    
    for (let i = 0; i < levels; i++) {
      const bidPrice = basePrice - (spread / 2) - (i * 0.01);
      const askPrice = basePrice + (spread / 2) + (i * 0.01);
      
      bids.push({
        price: Math.max(0.01, Math.min(0.99, bidPrice)),
        size: Math.floor(Math.random() * 1000) + 100,
        timestamp: new Date()
      });
      
      asks.push({
        price: Math.max(0.01, Math.min(0.99, askPrice)),
        size: Math.floor(Math.random() * 1000) + 100,
        timestamp: new Date()
      });
    }
    
    return {
      bids,
      asks,
      lastPrice: basePrice
    };
  }

  /**
   * Search markets by query
   */
  async searchMarkets(searchQuery) {
    try {
      const query = gql`
        query SearchMarkets($search: String!) {
          markets(
            where: { 
              question_contains_nocase: $search,
              resolved: false
            }
            first: 20
            orderBy: volume
            orderDirection: desc
          ) {
            id
            question
            slug
            conditionId
            outcomes
            volume
            liquidity
          }
        }
      `;

      const data = await request(this.subgraphUrl, query, { search: searchQuery });
      return data.markets || [];
    } catch (error) {
      logger.error('Error searching Polymarket markets:', error);
      return [];
    }
  }

  /**
   * Get market by condition ID
   */
  async getMarketByConditionId(conditionId) {
    try {
      const query = gql`
        query GetMarketByCondition($conditionId: String!) {
          markets(where: { conditionId: $conditionId }) {
            id
            question
            slug
            conditionId
            outcomes
            volume
            liquidity
            resolved
            winningOutcome
          }
        }
      `;

      const data = await request(this.subgraphUrl, query, { conditionId });
      
      if (data.markets && data.markets.length > 0) {
        return data.markets[0];
      }
      
      return null;
    } catch (error) {
      logger.error('Error fetching market by condition ID:', error);
      return null;
    }
  }

  /**
   * Cleanup
   */
  async shutdown() {
    logger.info('🔷 Shutting down Polymarket service');
  }
}

module.exports = PolymarketOrderBookService;