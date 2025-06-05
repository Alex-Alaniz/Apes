// Backend service for syncing markets from Polymarket pipeline
const axios = require('axios');
const db = require('../config/database');

class PolymarketSyncService {
  constructor() {
    this.baseUrl = 'https://polymarket.primape.app/api/v1';
    this.alternativeUrl = 'https://polymarket-pipeline-primape.replit.app/api/v1';
    this.syncInterval = null;
    this.isRunning = false;
  }

  /**
   * Start the sync service
   * @param {number} intervalMinutes - Sync interval in minutes (default: 10)
   */
  async start(intervalMinutes = 10) {
    if (this.isRunning) {
      console.log('Polymarket sync service is already running');
      return;
    }

    this.isRunning = true;
    console.log('Starting Polymarket sync service...');
    
    // Initial sync
    await this.syncMarkets();
    
    // Set up periodic sync
    this.syncInterval = setInterval(async () => {
      await this.syncMarkets();
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Stop the sync service
   */
  stop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.isRunning = false;
    console.log('Polymarket sync service stopped');
  }

  /**
   * Sync markets from Polymarket pipeline
   */
  async syncMarkets() {
    console.log('Starting Polymarket sync...');
    
    try {
      // Fetch deployed markets from Polymarket pipeline
      const markets = await this.fetchDeployedMarkets();
      
      if (!markets || markets.length === 0) {
        console.log('No markets to sync');
        return;
      }

      console.log(`Found ${markets.length} markets from Polymarket`);

      // Process each market
      for (const market of markets) {
        await this.processMarket(market);
      }

      console.log('Polymarket sync completed');
    } catch (error) {
      console.error('Error during Polymarket sync:', error);
    }
  }

  /**
   * Fetch deployed markets from Polymarket API
   */
  async fetchDeployedMarkets() {
    try {
      // Try validated endpoint first
      try {
        const response = await axios.get(`${this.baseUrl}/solana/deployed-markets?validate=true`);
        console.log('Using validated endpoint');
        return response.data.markets || [];
      } catch (validationError) {
        console.log('Validation endpoint unavailable, using standard endpoint with manual filtering');
        
        // Fall back to standard endpoint
        const response = await axios.get(`${this.baseUrl}/solana/deployed-markets`);
        const allMarkets = response.data.markets || [];
        
        // Filter for active markets
        const now = new Date();
        const activeMarkets = allMarkets.filter(market => {
          // Check if market has ended
          const endTime = new Date(market.end_time);
          if (endTime <= now) {
            console.log(`Filtering out expired market: ${market.question}`);
            return false;
          }
          
          // Check status
          if (market.status === 'resolved' || market.status === 'cancelled') {
            console.log(`Filtering out ${market.status} market: ${market.question}`);
            return false;
          }
          
          return true;
        });
        
        console.log(`Filtered ${allMarkets.length} markets down to ${activeMarkets.length} active markets`);
        return activeMarkets;
      }
    } catch (error) {
      console.error('Error fetching from primary URL, trying alternative:', error.message);
      
      // Try alternative URL
      try {
        const response = await axios.get(`${this.alternativeUrl}/solana/deployed-markets`);
        return response.data.markets || [];
      } catch (altError) {
        console.error('Error fetching from alternative URL:', altError.message);
        throw new Error('Failed to fetch markets from Polymarket pipeline');
      }
    }
  }

  /**
   * Process a single market - check if it exists and store metadata
   */
  async processMarket(polymarketData) {
    try {
      // Check if market already exists by poly_id
      const existingMarket = await db.query(
        'SELECT id, market_address FROM markets WHERE poly_id = $1',
        [polymarketData.poly_id]
      );

      if (existingMarket.rows.length > 0) {
        // Update existing market with latest data
        await this.updateMarketMetadata(existingMarket.rows[0].id, polymarketData);
      } else {
        // Store new market metadata (will be created on-chain later)
        await this.createMarketMetadata(polymarketData);
      }
    } catch (error) {
      console.error(`Error processing market ${polymarketData.poly_id}:`, error);
    }
  }

  /**
   * Create new market metadata in database
   */
  async createMarketMetadata(polymarketData) {
    const query = `
      INSERT INTO market_metadata (
        poly_id,
        apechain_market_id,
        question,
        category,
        market_type,
        end_time,
        options,
        options_metadata,
        assets,
        status,
        deployed_at,
        is_trending,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
      RETURNING id
    `;

    const values = [
      polymarketData.poly_id,
      polymarketData.apechain_market_id,
      polymarketData.question,
      polymarketData.category,
      polymarketData.market_type,
      polymarketData.end_time,
      JSON.stringify(polymarketData.options),
      JSON.stringify(polymarketData.options),
      JSON.stringify(polymarketData.assets),
      'pending_creation', // Status for markets not yet on Solana
      polymarketData.deployed_at,
      polymarketData.is_trending || false
    ];

    const result = await db.query(query, values);
    console.log(`Created metadata for market: ${polymarketData.question}`);
    return result.rows[0];
  }

  /**
   * Update existing market metadata
   */
  async updateMarketMetadata(marketId, polymarketData) {
    const query = `
      UPDATE markets 
      SET 
        assets = $1,
        options_metadata = $2,
        is_trending = $3,
        apechain_market_id = $4,
        updated_at = NOW()
      WHERE id = $5
    `;

    const values = [
      JSON.stringify(polymarketData.assets),
      JSON.stringify(polymarketData.options),
      polymarketData.is_trending || false,
      polymarketData.apechain_market_id,
      marketId
    ];

    await db.query(query, values);
    console.log(`Updated metadata for market ID: ${marketId}`);
  }

  /**
   * Get pending markets that need to be created on Solana
   */
  async getPendingMarkets() {
    const query = `
      SELECT * FROM market_metadata 
      WHERE status = 'pending_creation' 
      ORDER BY created_at ASC
    `;
    
    const result = await db.query(query);
    return result.rows;
  }

  /**
   * Mark market as created on Solana
   */
  async markMarketAsCreated(polyId, solanaMarketAddress) {
    // Move metadata to main markets table
    const metadataQuery = `
      SELECT * FROM market_metadata WHERE poly_id = $1
    `;
    const metadata = await db.query(metadataQuery, [polyId]);
    
    if (metadata.rows.length === 0) {
      throw new Error(`No metadata found for poly_id: ${polyId}`);
    }

    const marketData = metadata.rows[0];

    // Insert into markets table
    const insertQuery = `
      INSERT INTO markets (
        market_address,
        poly_id,
        apechain_market_id,
        question,
        category,
        market_type,
        end_time,
        options,
        options_metadata,
        assets,
        status,
        is_trending,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
    `;

    const values = [
      solanaMarketAddress,
      marketData.poly_id,
      marketData.apechain_market_id,
      marketData.question,
      marketData.category,
      marketData.market_type,
      marketData.end_time,
      marketData.options,
      marketData.options_metadata,
      marketData.assets,
      'Active',
      marketData.is_trending
    ];

    await db.query(insertQuery, values);

    // Update metadata status
    await db.query(
      'UPDATE market_metadata SET status = $1 WHERE poly_id = $2',
      ['created', polyId]
    );

    console.log(`Market created on Solana: ${solanaMarketAddress}`);
  }

  /**
   * Get market assets for frontend
   */
  async getMarketAssets(marketAddress) {
    const query = `
      SELECT assets, options_metadata 
      FROM markets 
      WHERE market_address = $1
    `;
    
    const result = await db.query(query, [marketAddress]);
    if (result.rows.length > 0) {
      return {
        assets: result.rows[0].assets,
        options_metadata: result.rows[0].options_metadata
      };
    }
    return null;
  }
}

// Export singleton instance
module.exports = new PolymarketSyncService(); 