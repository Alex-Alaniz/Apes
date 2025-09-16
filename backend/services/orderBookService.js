const db = require('../config/database');
const logger = require('../utils/logger');

class OrderBookService {
  constructor() {
    this.polymarketService = null;
    this.kalshiService = null;
    this.updateInterval = null;
  }

  async initialize() {
    try {
      // Dynamic imports to avoid circular dependencies
      const PolymarketService = require('./polymarketOrderBookService');
      const KalshiService = require('./kalshiOrderBookService');
      
      this.polymarketService = new PolymarketService();
      this.kalshiService = new KalshiService();
      
      await this.polymarketService.initialize();
      await this.kalshiService.initialize();
      
      logger.info('📊 Order Book Service initialized successfully');
      
      // Start periodic updates
      this.startPeriodicUpdates();
    } catch (error) {
      logger.error('Failed to initialize Order Book Service:', error);
      throw error;
    }
  }

  /**
   * Get aggregated order book for a market
   * Combines liquidity from Polymarket and Kalshi
   */
  async getAggregatedOrderBook(marketAddress) {
    try {
      // Get market mapping from database
      const mappingQuery = `
        SELECT 
          m.*,
          em.polymarket_slug,
          em.polymarket_condition_id,
          em.kalshi_ticker,
          em.kalshi_market_id
        FROM markets m
        LEFT JOIN external_market_mappings em ON m.market_address = em.market_address
        WHERE m.market_address = $1
      `;
      
      const result = await db.query(mappingQuery, [marketAddress]);
      
      if (result.rows.length === 0) {
        throw new Error('Market not found');
      }
      
      const market = result.rows[0];
      const orderBooks = {
        polymarket: null,
        kalshi: null,
        aggregated: {
          bids: [],
          asks: [],
          spread: null,
          midPrice: null,
          lastUpdate: new Date()
        }
      };

      // Fetch Polymarket order book if mapped
      if (market.polymarket_slug) {
        try {
          orderBooks.polymarket = await this.polymarketService.getOrderBook(
            market.polymarket_slug,
            market.polymarket_condition_id
          );
        } catch (error) {
          logger.warn(`Failed to fetch Polymarket order book: ${error.message}`);
        }
      }

      // Fetch Kalshi order book if mapped
      if (market.kalshi_ticker) {
        try {
          orderBooks.kalshi = await this.kalshiService.getOrderBook(
            market.kalshi_ticker
          );
        } catch (error) {
          logger.warn(`Failed to fetch Kalshi order book: ${error.message}`);
        }
      }

      // Aggregate order books
      orderBooks.aggregated = this.aggregateOrderBooks(
        orderBooks.polymarket,
        orderBooks.kalshi,
        market.options
      );

      return orderBooks;
    } catch (error) {
      logger.error('Error fetching aggregated order book:', error);
      throw error;
    }
  }

  /**
   * Aggregate multiple order books into a single view
   */
  aggregateOrderBooks(polymarketBook, kalshiBook, marketOptions) {
    const aggregated = {
      options: {},
      lastUpdate: new Date(),
      sources: []
    };

    // Initialize options
    marketOptions.forEach((option, index) => {
      aggregated.options[index] = {
        label: option,
        bids: [],
        asks: [],
        bestBid: null,
        bestAsk: null,
        spread: null,
        midPrice: null,
        volume24h: 0
      };
    });

    // Add Polymarket liquidity
    if (polymarketBook) {
      aggregated.sources.push('polymarket');
      this.mergePolymarketBook(aggregated, polymarketBook, marketOptions);
    }

    // Add Kalshi liquidity
    if (kalshiBook) {
      aggregated.sources.push('kalshi');
      this.mergeKalshiBook(aggregated, kalshiBook, marketOptions);
    }

    // Calculate best prices and spreads
    Object.keys(aggregated.options).forEach(optionIndex => {
      const option = aggregated.options[optionIndex];
      
      // Sort bids (highest first) and asks (lowest first)
      option.bids.sort((a, b) => b.price - a.price);
      option.asks.sort((a, b) => a.price - b.price);
      
      // Set best bid/ask
      option.bestBid = option.bids[0] || null;
      option.bestAsk = option.asks[0] || null;
      
      // Calculate spread and mid price
      if (option.bestBid && option.bestAsk) {
        option.spread = option.bestAsk.price - option.bestBid.price;
        option.midPrice = (option.bestBid.price + option.bestAsk.price) / 2;
      }
    });

    return aggregated;
  }

  /**
   * Merge Polymarket order book data
   */
  mergePolymarketBook(aggregated, polymarketBook, marketOptions) {
    // Polymarket uses outcome tokens (YES/NO)
    // Map to our option indices
    if (polymarketBook.outcomes) {
      polymarketBook.outcomes.forEach((outcome, index) => {
        if (index < marketOptions.length) {
          const optionData = aggregated.options[index];
          
          // Add bids
          if (outcome.bids) {
            outcome.bids.forEach(bid => {
              optionData.bids.push({
                price: bid.price,
                size: bid.size,
                source: 'polymarket',
                originalData: bid
              });
            });
          }
          
          // Add asks
          if (outcome.asks) {
            outcome.asks.forEach(ask => {
              optionData.asks.push({
                price: ask.price,
                size: ask.size,
                source: 'polymarket',
                originalData: ask
              });
            });
          }
          
          // Add volume
          optionData.volume24h += outcome.volume24h || 0;
        }
      });
    }
  }

  /**
   * Merge Kalshi order book data
   */
  mergeKalshiBook(aggregated, kalshiBook, marketOptions) {
    // Kalshi uses different structure
    // Map their yes_bid/yes_ask to our options
    if (kalshiBook.yes_bid && kalshiBook.yes_ask && marketOptions.length >= 2) {
      // For binary markets, YES = option 0, NO = option 1
      
      // YES option (index 0)
      aggregated.options[0].bids.push({
        price: kalshiBook.yes_bid / 100, // Kalshi uses cents
        size: kalshiBook.yes_bid_size || 0,
        source: 'kalshi',
        originalData: { yes_bid: kalshiBook.yes_bid }
      });
      
      aggregated.options[0].asks.push({
        price: kalshiBook.yes_ask / 100,
        size: kalshiBook.yes_ask_size || 0,
        source: 'kalshi',
        originalData: { yes_ask: kalshiBook.yes_ask }
      });
      
      // NO option (index 1) - inverse of YES prices
      aggregated.options[1].bids.push({
        price: 1 - (kalshiBook.yes_ask / 100), // NO bid = 1 - YES ask
        size: kalshiBook.yes_ask_size || 0,
        source: 'kalshi',
        originalData: { derived_from: 'yes_ask' }
      });
      
      aggregated.options[1].asks.push({
        price: 1 - (kalshiBook.yes_bid / 100), // NO ask = 1 - YES bid
        size: kalshiBook.yes_bid_size || 0,
        source: 'kalshi',
        originalData: { derived_from: 'yes_bid' }
      });
      
      // Add volume
      if (kalshiBook.volume) {
        aggregated.options[0].volume24h += kalshiBook.volume;
        aggregated.options[1].volume24h += kalshiBook.volume;
      }
    }
  }

  /**
   * Start periodic order book updates
   */
  startPeriodicUpdates() {
    // Update active markets every 30 seconds
    this.updateInterval = setInterval(async () => {
      try {
        await this.updateActiveMarketOrderBooks();
      } catch (error) {
        logger.error('Error in periodic order book update:', error);
      }
    }, 30000); // 30 seconds
  }

  /**
   * Update order books for all active markets
   */
  async updateActiveMarketOrderBooks() {
    try {
      // Get active markets with external mappings
      const query = `
        SELECT DISTINCT m.market_address, em.*
        FROM markets m
        JOIN external_market_mappings em ON m.market_address = em.market_address
        WHERE m.status = 'Active'
        AND (em.polymarket_slug IS NOT NULL OR em.kalshi_ticker IS NOT NULL)
      `;
      
      const result = await db.query(query);
      
      logger.info(`📊 Updating order books for ${result.rows.length} active markets`);
      
      // Update each market (with rate limiting)
      for (const market of result.rows) {
        try {
          const orderBook = await this.getAggregatedOrderBook(market.market_address);
          
          // Cache the order book data
          await this.cacheOrderBook(market.market_address, orderBook);
          
          // Small delay to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          logger.error(`Failed to update order book for ${market.market_address}:`, error);
        }
      }
    } catch (error) {
      logger.error('Error updating active market order books:', error);
    }
  }

  /**
   * Cache order book data in database
   */
  async cacheOrderBook(marketAddress, orderBook) {
    try {
      const query = `
        INSERT INTO order_book_cache (
          market_address,
          order_book_data,
          sources,
          last_update
        ) VALUES ($1, $2, $3, $4)
        ON CONFLICT (market_address) DO UPDATE SET
          order_book_data = EXCLUDED.order_book_data,
          sources = EXCLUDED.sources,
          last_update = EXCLUDED.last_update
      `;
      
      await db.query(query, [
        marketAddress,
        JSON.stringify(orderBook.aggregated),
        orderBook.aggregated.sources,
        new Date()
      ]);
    } catch (error) {
      logger.error('Error caching order book:', error);
    }
  }

  /**
   * Get cached order book (for quick responses)
   */
  async getCachedOrderBook(marketAddress) {
    try {
      const query = `
        SELECT * FROM order_book_cache 
        WHERE market_address = $1
        AND last_update > NOW() - INTERVAL '2 minutes'
      `;
      
      const result = await db.query(query, [marketAddress]);
      
      if (result.rows.length > 0) {
        return {
          ...JSON.parse(result.rows[0].order_book_data),
          cached: true,
          cacheAge: Date.now() - new Date(result.rows[0].last_update).getTime()
        };
      }
      
      return null;
    } catch (error) {
      logger.error('Error fetching cached order book:', error);
      return null;
    }
  }

  /**
   * Cleanup
   */
  async shutdown() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    if (this.polymarketService) {
      await this.polymarketService.shutdown();
    }
    
    if (this.kalshiService) {
      await this.kalshiService.shutdown();
    }
  }
}

module.exports = new OrderBookService();