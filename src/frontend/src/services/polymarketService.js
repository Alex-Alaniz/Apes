// Service for fetching market data from Polymarket pipeline
import axios from 'axios';

class PolymarketService {
  constructor() {
    this.baseUrl = 'https://polymarket.primape.app/api/v1';
    this.alternativeUrl = 'https://polymarket-pipeline-primape.replit.app/api/v1';
    this.pollingInterval = null;
    this.lastSync = null;
  }

  /**
   * Fetch deployed markets for Solana integration
   * @returns {Promise<Array>} Array of market data
   */
  async fetchDeployedMarkets() {
    try {
      const response = await axios.get(`${this.baseUrl}/solana/deployed-markets`);
      return this.transformMarkets(response.data.markets || []);
    } catch (error) {
      console.error('Error fetching from primary URL, trying alternative:', error);
      
      // Try alternative URL if primary fails
      try {
        const response = await axios.get(`${this.alternativeUrl}/solana/deployed-markets`);
        return this.transformMarkets(response.data.markets || []);
      } catch (altError) {
        console.error('Error fetching from alternative URL:', altError);
        throw new Error('Failed to fetch markets from Polymarket pipeline');
      }
    }
  }

  /**
   * Fetch live markets only
   * @returns {Promise<Array>} Array of live market data
   */
  async fetchLiveMarkets() {
    try {
      const response = await axios.get(`${this.baseUrl}/markets`, {
        params: { status: 'live' }
      });
      return this.transformMarkets(response.data.markets || []);
    } catch (error) {
      console.error('Error fetching live markets:', error);
      return [];
    }
  }

  /**
   * Fetch market assets for frontend mapping
   * @returns {Promise<Object>} Market assets keyed by blockchain ID
   */
  async fetchMarketAssets() {
    try {
      const response = await axios.get(`${this.baseUrl}/markets/chain/assets`);
      return response.data || {};
    } catch (error) {
      console.error('Error fetching market assets:', error);
      return {};
    }
  }

  /**
   * Transform Polymarket data to match our Solana market structure
   */
  transformMarkets(markets) {
    return markets.map(market => ({
      // External references
      polyId: market.poly_id,
      apechainMarketId: market.apechain_market_id,
      
      // Basic market info
      question: market.question,
      category: market.category?.toLowerCase() || 'general',
      status: this.determineStatus(market),
      endTime: market.end_time,
      
      // Options
      options: market.options.map(opt => opt.label),
      options_metadata: market.options.map(opt => ({
        label: opt.label,
        icon: opt.icon,
        polyId: opt.option_poly_id
      })),
      
      // Assets
      assets: {
        banner: market.assets?.banner || null,
        icon: market.assets?.icon || null
      },
      
      // Additional metadata
      marketType: market.market_type,
      deployedAt: market.deployed_at,
      isTrending: market.is_trending || false,
      
      // Initialize with zero values (will be updated from blockchain)
      totalVolume: 0,
      optionPools: market.options.map(() => 0),
      optionPercentages: market.options.map(() => 50), // Default to even split
      participantCount: 0
    }));
  }

  /**
   * Determine market status based on end time
   */
  determineStatus(market) {
    if (market.status === 'resolved') return 'Resolved';
    
    const now = new Date();
    const endTime = new Date(market.end_time);
    
    if (endTime < now) {
      return 'Pending Resolution';
    }
    
    return 'Active';
  }

  /**
   * Start polling for new markets
   * @param {Function} onNewMarkets - Callback when new markets are found
   * @param {number} intervalMs - Polling interval in milliseconds (default: 5 minutes)
   */
  startPolling(onNewMarkets, intervalMs = 5 * 60 * 1000) {
    // Initial fetch
    this.fetchAndNotify(onNewMarkets);
    
    // Set up polling
    this.pollingInterval = setInterval(() => {
      this.fetchAndNotify(onNewMarkets);
    }, intervalMs);
  }

  /**
   * Stop polling for markets
   */
  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  /**
   * Fetch markets and notify about new ones
   */
  async fetchAndNotify(onNewMarkets) {
    try {
      const markets = await this.fetchDeployedMarkets();
      
      // Filter for markets not yet synced (this logic would check against your Solana program)
      const newMarkets = markets.filter(market => {
        // TODO: Check if market exists in Solana program
        // For now, we'll use deployedAt timestamp
        if (!this.lastSync) return true;
        return new Date(market.deployedAt) > this.lastSync;
      });
      
      if (newMarkets.length > 0) {
        console.log(`Found ${newMarkets.length} new markets from Polymarket`);
        onNewMarkets(newMarkets);
      }
      
      this.lastSync = new Date();
    } catch (error) {
      console.error('Error in polling cycle:', error);
    }
  }

  /**
   * Get market by Polymarket ID
   */
  async getMarketByPolyId(polyId) {
    const markets = await this.fetchDeployedMarkets();
    return markets.find(m => m.polyId === polyId) || null;
  }

  /**
   * Get market by ApeChain ID (for cross-referencing)
   */
  async getMarketByApechainId(apechainId) {
    const markets = await this.fetchDeployedMarkets();
    return markets.find(m => m.apechainMarketId === apechainId) || null;
  }

  /**
   * Check if market should be resolved based on end time
   */
  shouldResolveMarket(market) {
    const now = new Date();
    const endTime = new Date(market.endTime);
    return endTime < now && market.status === 'Active';
  }

  /**
   * Get markets that need resolution
   */
  async getMarketsNeedingResolution() {
    const markets = await this.fetchLiveMarkets();
    return markets.filter(market => this.shouldResolveMarket(market));
  }
}

// Export singleton instance
export default new PolymarketService(); 