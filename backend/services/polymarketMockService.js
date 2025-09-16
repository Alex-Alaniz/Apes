/**
 * Mock Polymarket API Service
 * Provides realistic test data for development and testing
 */

class PolymarketMockService {
  constructor() {
    this.mockMarkets = this.generateMockMarkets();
    this.mockOrders = new Map();
    this.mockPositions = new Map();
    this.orderIdCounter = 1000;
  }

  /**
   * Generate realistic mock markets
   */
  generateMockMarkets() {
    const markets = [
      {
        id: 'btc-100k-2024',
        question: 'Will Bitcoin reach $100,000 by December 31, 2024?',
        description: 'This market resolves to "Yes" if Bitcoin (BTC) trades at or above $100,000 USD on any major exchange before December 31, 2024, 11:59 PM UTC.',
        category: 'Crypto',
        tags: ['bitcoin', 'crypto', 'price'],
        outcomes: [
          { id: 0, name: 'Yes', price: 0.65 },
          { id: 1, name: 'No', price: 0.35 }
        ],
        volume: 2500000,
        liquidity: 1000000,
        createdAt: '2024-01-01T00:00:00Z',
        endDate: '2024-12-31T23:59:59Z',
        imageUrl: 'https://polymarket.com/image/btc-100k.jpg',
        isResolved: false,
        winner: null
      },
      {
        id: 'trump-2024-election',
        question: 'Will Donald Trump win the 2024 US Presidential Election?',
        description: 'This market resolves to "Yes" if Donald Trump wins the 2024 US Presidential Election.',
        category: 'Politics',
        tags: ['politics', 'election', 'usa'],
        outcomes: [
          { id: 0, name: 'Yes', price: 0.48 },
          { id: 1, name: 'No', price: 0.52 }
        ],
        volume: 15000000,
        liquidity: 5000000,
        createdAt: '2024-01-15T00:00:00Z',
        endDate: '2024-11-06T00:00:00Z',
        imageUrl: 'https://polymarket.com/image/election-2024.jpg',
        isResolved: false,
        winner: null
      },
      {
        id: 'fed-rate-cut-march',
        question: 'Will the Fed cut rates in March 2024?',
        description: 'This market resolves to "Yes" if the Federal Reserve cuts interest rates at their March 2024 meeting.',
        category: 'Economics',
        tags: ['economics', 'fed', 'rates'],
        outcomes: [
          { id: 0, name: 'Yes', price: 0.72 },
          { id: 1, name: 'No', price: 0.28 }
        ],
        volume: 800000,
        liquidity: 300000,
        createdAt: '2024-02-01T00:00:00Z',
        endDate: '2024-03-31T23:59:59Z',
        imageUrl: 'https://polymarket.com/image/fed-rates.jpg',
        isResolved: false,
        winner: null
      },
      {
        id: 'superbowl-winner-2024',
        question: 'Will the Chiefs win Super Bowl 2024?',
        description: 'This market resolves to "Yes" if the Kansas City Chiefs win Super Bowl LVIII.',
        category: 'Sports',
        tags: ['sports', 'nfl', 'superbowl'],
        outcomes: [
          { id: 0, name: 'Yes', price: 0.55 },
          { id: 1, name: 'No', price: 0.45 }
        ],
        volume: 3500000,
        liquidity: 1200000,
        createdAt: '2024-01-20T00:00:00Z',
        endDate: '2024-02-11T23:59:59Z',
        imageUrl: 'https://polymarket.com/image/superbowl-2024.jpg',
        isResolved: false,
        winner: null
      },
      {
        id: 'ai-breakthrough-2024',
        question: 'Will AGI be achieved in 2024?',
        description: 'This market resolves to "Yes" if a major AI lab announces achievement of Artificial General Intelligence in 2024.',
        category: 'Technology',
        tags: ['ai', 'technology', 'agi'],
        outcomes: [
          { id: 0, name: 'Yes', price: 0.15 },
          { id: 1, name: 'No', price: 0.85 }
        ],
        volume: 1200000,
        liquidity: 400000,
        createdAt: '2024-01-10T00:00:00Z',
        endDate: '2024-12-31T23:59:59Z',
        imageUrl: 'https://polymarket.com/image/agi-2024.jpg',
        isResolved: false,
        winner: null
      }
    ];

    // Add more variety with different price movements
    markets.forEach(market => {
      // Simulate price history
      market.priceHistory = this.generatePriceHistory(market.outcomes[0].price);
      
      // Add order book depth
      market.orderBook = this.generateOrderBook(market.outcomes[0].price);
      
      // Add recent trades
      market.recentTrades = this.generateRecentTrades(market.id);
    });

    return markets;
  }

  /**
   * Generate price history for charts
   */
  generatePriceHistory(currentPrice, days = 30) {
    const history = [];
    let price = currentPrice - (Math.random() * 0.2 - 0.1); // Start ±10% from current
    
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      // Random walk with mean reversion
      const change = (Math.random() - 0.5) * 0.05;
      price = Math.max(0.01, Math.min(0.99, price + change));
      
      // Trend towards current price as we get closer to present
      if (i < 5) {
        price = price * 0.8 + currentPrice * 0.2;
      }
      
      history.push({
        timestamp: date.toISOString(),
        price: parseFloat(price.toFixed(4))
      });
    }
    
    return history;
  }

  /**
   * Generate order book with bids and asks
   */
  generateOrderBook(midPrice) {
    const orderBook = { bids: [], asks: [] };
    
    // Generate bids (below mid price)
    for (let i = 1; i <= 10; i++) {
      const price = midPrice - (i * 0.001);
      const size = Math.floor(Math.random() * 10000) + 1000;
      orderBook.bids.push({
        price: parseFloat(price.toFixed(4)),
        size,
        total: size * price
      });
    }
    
    // Generate asks (above mid price)
    for (let i = 1; i <= 10; i++) {
      const price = midPrice + (i * 0.001);
      const size = Math.floor(Math.random() * 10000) + 1000;
      orderBook.asks.push({
        price: parseFloat(price.toFixed(4)),
        size,
        total: size * price
      });
    }
    
    return orderBook;
  }

  /**
   * Generate recent trades
   */
  generateRecentTrades(marketId, count = 20) {
    const trades = [];
    const now = Date.now();
    
    for (let i = 0; i < count; i++) {
      const timestamp = new Date(now - (i * 60000 * Math.random())); // Random times in last hour
      trades.push({
        id: `trade-${marketId}-${i}`,
        side: Math.random() > 0.5 ? 'BUY' : 'SELL',
        price: parseFloat((0.3 + Math.random() * 0.4).toFixed(4)),
        size: Math.floor(Math.random() * 5000) + 100,
        timestamp: timestamp.toISOString()
      });
    }
    
    return trades.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }

  /**
   * Get markets with filters
   */
  async getMarkets({ category, search, limit = 20, offset = 0 }) {
    let markets = [...this.mockMarkets];
    
    // Apply filters
    if (category) {
      markets = markets.filter(m => 
        m.category.toLowerCase() === category.toLowerCase()
      );
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      markets = markets.filter(m => 
        m.question.toLowerCase().includes(searchLower) ||
        m.tags.some(tag => tag.includes(searchLower))
      );
    }
    
    // Sort by volume (most popular first)
    markets.sort((a, b) => b.volume - a.volume);
    
    // Paginate
    const paginatedMarkets = markets.slice(offset, offset + limit);
    
    return {
      markets: paginatedMarkets,
      total: markets.length,
      limit,
      offset
    };
  }

  /**
   * Get single market details
   */
  async getMarket(marketId) {
    const market = this.mockMarkets.find(m => m.id === marketId);
    if (!market) {
      throw new Error('Market not found');
    }
    return market;
  }

  /**
   * Place a mock order
   */
  async placeOrder(userId, marketId, outcomeId, size, side) {
    const market = await this.getMarket(marketId);
    const outcome = market.outcomes.find(o => o.id === outcomeId);
    
    if (!outcome) {
      throw new Error('Invalid outcome ID');
    }
    
    const orderId = `order-${this.orderIdCounter++}`;
    const order = {
      id: orderId,
      userId,
      marketId,
      outcomeId,
      side,
      size,
      price: outcome.price,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      filledAt: null,
      fee: size * 0.02 // 2% Polymarket fee
    };
    
    // Store order
    this.mockOrders.set(orderId, order);
    
    // Simulate order fill after short delay
    setTimeout(() => {
      order.status = 'FILLED';
      order.filledAt = new Date().toISOString();
      
      // Update user position
      this.updatePosition(userId, marketId, outcomeId, size, side, outcome.price);
    }, 1000 + Math.random() * 2000); // 1-3 second delay
    
    return order;
  }

  /**
   * Update user position
   */
  updatePosition(userId, marketId, outcomeId, size, side, price) {
    const positionKey = `${userId}-${marketId}-${outcomeId}`;
    let position = this.mockPositions.get(positionKey);
    
    if (!position) {
      position = {
        userId,
        marketId,
        outcomeId,
        shares: 0,
        avgPrice: 0,
        totalCost: 0
      };
    }
    
    if (side === 'BUY') {
      const newTotalCost = position.totalCost + (size * price);
      const newShares = position.shares + size;
      position.avgPrice = newTotalCost / newShares;
      position.shares = newShares;
      position.totalCost = newTotalCost;
    } else {
      position.shares = Math.max(0, position.shares - size);
      if (position.shares === 0) {
        position.avgPrice = 0;
        position.totalCost = 0;
      }
    }
    
    this.mockPositions.set(positionKey, position);
  }

  /**
   * Get user positions
   */
  async getUserPositions(userId) {
    const positions = [];
    
    for (const [key, position] of this.mockPositions) {
      if (position.userId === userId && position.shares > 0) {
        const market = await this.getMarket(position.marketId);
        const outcome = market.outcomes.find(o => o.id === position.outcomeId);
        
        positions.push({
          ...position,
          question: market.question,
          outcomeName: outcome.name,
          currentPrice: outcome.price,
          value: position.shares * outcome.price,
          pnl: (outcome.price - position.avgPrice) * position.shares,
          pnlPercent: ((outcome.price - position.avgPrice) / position.avgPrice) * 100
        });
      }
    }
    
    return positions;
  }

  /**
   * Get order history
   */
  async getOrderHistory(userId, limit = 50) {
    const orders = [];
    
    for (const [orderId, order] of this.mockOrders) {
      if (order.userId === userId) {
        const market = await this.getMarket(order.marketId);
        const outcome = market.outcomes.find(o => o.id === order.outcomeId);
        
        orders.push({
          ...order,
          question: market.question,
          outcomeName: outcome.name
        });
      }
    }
    
    // Sort by creation date, newest first
    orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    
    return orders.slice(0, limit);
  }

  /**
   * Cancel an order
   */
  async cancelOrder(userId, orderId) {
    const order = this.mockOrders.get(orderId);
    
    if (!order) {
      throw new Error('Order not found');
    }
    
    if (order.userId !== userId) {
      throw new Error('Unauthorized');
    }
    
    if (order.status !== 'PENDING') {
      throw new Error('Order cannot be cancelled');
    }
    
    order.status = 'CANCELLED';
    order.cancelledAt = new Date().toISOString();
    
    return order;
  }

  /**
   * Get leaderboard data
   */
  async getLeaderboard(period = 'weekly', limit = 20) {
    // Generate mock leaderboard
    const leaderboard = [];
    
    for (let i = 0; i < limit; i++) {
      leaderboard.push({
        rank: i + 1,
        userId: `user-${Math.random().toString(36).substr(2, 9)}`,
        walletAddress: `0x${Math.random().toString(16).substr(2, 40)}`,
        pnl: Math.floor(Math.random() * 50000 - 10000),
        winRate: parseFloat((40 + Math.random() * 30).toFixed(1)),
        totalVolume: Math.floor(Math.random() * 1000000),
        tradesCount: Math.floor(Math.random() * 500) + 50,
        apesBalance: Math.floor(Math.random() * 200000),
        tier: ['standard', 'bronze', 'silver', 'gold', 'platinum'][Math.floor(Math.random() * 5)]
      });
    }
    
    // Sort by P&L
    leaderboard.sort((a, b) => b.pnl - a.pnl);
    
    return leaderboard;
  }

  /**
   * Get platform statistics
   */
  async getPlatformStats() {
    return {
      totalVolume: 45678900,
      totalUsers: 12456,
      totalFeesCollected: 913578,
      totalFeesSaved: 456789,
      averageFeeRate: 0.0045,
      topMarkets: this.mockMarkets.slice(0, 5).map(m => ({
        id: m.id,
        question: m.question,
        volume: m.volume
      })),
      userTierDistribution: {
        standard: 8500,
        bronze: 2500,
        silver: 800,
        gold: 500,
        platinum: 156
      }
    };
  }
}

// Export singleton instance
module.exports = new PolymarketMockService();