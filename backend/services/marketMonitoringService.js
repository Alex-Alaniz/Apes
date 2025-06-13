const db = require('../config/database');

class MarketMonitoringService {
  constructor() {
    this.isRunning = false;
    this.checkInterval = 60000; // Check every minute
  }

  /**
   * Start monitoring markets for status updates
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️ Market monitoring service is already running');
      return;
    }

    console.log('🚀 Starting market monitoring service...');
    this.isRunning = true;
    
    // Run immediately on start
    this.checkMarketEndTimes();
    
    // Then run every minute
    this.intervalId = setInterval(() => {
      this.checkMarketEndTimes();
    }, this.checkInterval);
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (!this.isRunning) {
      console.log('⚠️ Market monitoring service is not running');
      return;
    }

    console.log('🛑 Stopping market monitoring service...');
    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Check for markets that should have ended and update their status
   */
  async checkMarketEndTimes() {
    try {
      const now = new Date();
      console.log(`⏰ Checking market end times at ${now.toISOString()}`);
      
      // Find markets that should have ended
      const expiredMarketsQuery = `
        SELECT 
          market_address, 
          question, 
          resolution_date,
          tournament_id,
          options
        FROM markets 
        WHERE status = 'Active' 
          AND resolution_date IS NOT NULL
          AND resolution_date <= $1
        ORDER BY resolution_date ASC
      `;
      
      const result = await db.query(expiredMarketsQuery, [now]);
      
      if (result.rows.length === 0) {
        console.log('✅ No markets need status update');
        return;
      }
      
      console.log(`📊 Found ${result.rows.length} markets that have ended`);
      
      for (const market of result.rows) {
        try {
          // Update market status to pending resolution
          const updateQuery = `
            UPDATE markets 
            SET 
              status = 'Pending Resolution',
              updated_at = NOW()
            WHERE market_address = $1
              AND status = 'Active'
            RETURNING market_address, question, status
          `;
          
          const updateResult = await db.query(updateQuery, [market.market_address]);
          
          if (updateResult.rows.length > 0) {
            console.log(`🏁 Market ended and marked for resolution:`);
            console.log(`   - Question: ${market.question}`);
            console.log(`   - End time: ${market.resolution_date}`);
            console.log(`   - Market: ${market.market_address}`);
            
            // Log the event for audit
            await this.logMarketStatusChange(
              market.market_address,
              'Active',
              'Pending Resolution',
              'auto_end_time',
              {
                question: market.question,
                resolution_date: market.resolution_date,
                tournament_id: market.tournament_id
              }
            );
          }
        } catch (marketError) {
          console.error(`Error updating market ${market.market_address}:`, marketError);
        }
      }
      
    } catch (error) {
      console.error('Error in checkMarketEndTimes:', error);
    }
  }

  /**
   * Log market status changes for audit trail
   */
  async logMarketStatusChange(marketAddress, fromStatus, toStatus, changeType, metadata) {
    try {
      const logQuery = `
        INSERT INTO market_status_log (
          market_address,
          from_status,
          to_status,
          change_type,
          metadata,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())
      `;
      
      await db.query(logQuery, [
        marketAddress,
        fromStatus,
        toStatus,
        changeType,
        JSON.stringify(metadata)
      ]);
    } catch (error) {
      // Don't fail if logging fails, but report it
      console.error('Failed to log market status change:', error);
    }
  }

  /**
   * Manually check and update a specific market
   */
  async checkSingleMarket(marketAddress) {
    try {
      const now = new Date();
      
      const marketQuery = `
        SELECT 
          market_address,
          question,
          resolution_date,
          status
        FROM markets
        WHERE market_address = $1
      `;
      
      const result = await db.query(marketQuery, [marketAddress]);
      
      if (result.rows.length === 0) {
        return { error: 'Market not found' };
      }
      
      const market = result.rows[0];
      
      if (market.status !== 'Active') {
        return { 
          message: 'Market is not active',
          status: market.status 
        };
      }
      
      if (!market.resolution_date) {
        return { 
          message: 'Market has no resolution date set'
        };
      }
      
      if (new Date(market.resolution_date) > now) {
        return {
          message: 'Market has not ended yet',
          endsIn: new Date(market.resolution_date) - now,
          endTime: market.resolution_date
        };
      }
      
      // Update the market
      const updateQuery = `
        UPDATE markets 
        SET 
          status = 'Pending Resolution',
          updated_at = NOW()
        WHERE market_address = $1
        RETURNING *
      `;
      
      const updateResult = await db.query(updateQuery, [marketAddress]);
      
      return {
        success: true,
        message: 'Market updated to Pending Resolution',
        market: updateResult.rows[0]
      };
      
    } catch (error) {
      console.error('Error checking single market:', error);
      return { error: error.message };
    }
  }

  /**
   * Get upcoming market end times for monitoring
   */
  async getUpcomingMarketEnds(hours = 24) {
    try {
      const now = new Date();
      const futureTime = new Date(now.getTime() + hours * 60 * 60 * 1000);
      
      const query = `
        SELECT 
          market_address,
          question,
          resolution_date,
          tournament_id,
          EXTRACT(EPOCH FROM (resolution_date - NOW())) / 60 as minutes_until_end
        FROM markets
        WHERE status = 'Active'
          AND resolution_date IS NOT NULL
          AND resolution_date BETWEEN $1 AND $2
        ORDER BY resolution_date ASC
      `;
      
      const result = await db.query(query, [now, futureTime]);
      
      return result.rows.map(market => ({
        ...market,
        time_until_end: this.formatTimeUntil(market.minutes_until_end)
      }));
      
    } catch (error) {
      console.error('Error getting upcoming market ends:', error);
      return [];
    }
  }

  /**
   * Format minutes into human readable time
   */
  formatTimeUntil(minutes) {
    if (minutes < 0) return 'Ended';
    if (minutes < 60) return `${Math.floor(minutes)} minutes`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)} hours`;
    return `${Math.floor(minutes / 1440)} days`;
  }
}

// Create singleton instance
const marketMonitoringService = new MarketMonitoringService();

// Export service
module.exports = marketMonitoringService; 