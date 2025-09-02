const axios = require('axios');
const db = require('../../config/database');

class KalshiScraper {
  constructor() {
    this.baseUrl = 'https://api.elections.kalshi.com/v1';
    this.apiUrl = 'https://trading-api.kalshi.com/v1';
    this.sourceName = 'kalshi';
    this.apiKey = process.env.KALSHI_API_KEY;
    this.apiSecret = process.env.KALSHI_API_SECRET;
    this.token = null;
    this.tokenExpiry = null;
  }

  /**
   * Authenticate with Kalshi API
   */
  async authenticate() {
    // Check if we have a valid token
    if (this.token && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.token;
    }

    try {
      // For now, use public endpoints that don't require auth
      // Full auth implementation would require API credentials
      console.log('Using Kalshi public endpoints');
      return null;
    } catch (error) {
      console.error('Kalshi authentication failed:', error);
      throw error;
    }
  }

  /**
   * Calculate quality score for Kalshi markets
   */
  calculateQualityScore(market) {
    let score = 0;
    
    // Volume factor (0-0.3)
    if (market.volume) {
      const volume = parseFloat(market.volume);
      if (volume > 1000000) score += 0.3;
      else if (volume > 500000) score += 0.25;
      else if (volume > 100000) score += 0.2;
      else if (volume > 10000) score += 0.1;
    }
    
    // Open interest factor (0-0.2)
    if (market.open_interest) {
      const openInterest = parseFloat(market.open_interest);
      if (openInterest > 100000) score += 0.2;
      else if (openInterest > 50000) score += 0.15;
      else if (openInterest > 10000) score += 0.1;
    }
    
    // Market depth (0-0.2)
    if (market.yes_bid && market.yes_ask) {
      const spread = Math.abs(market.yes_ask - market.yes_bid);
      if (spread < 0.02) score += 0.2;
      else if (spread < 0.05) score += 0.15;
      else if (spread < 0.1) score += 0.1;
    }
    
    // Time relevance (0-0.2)
    const closeTime = new Date(market.close_time);
    const now = new Date();
    const hoursUntilClose = (closeTime - now) / (1000 * 60 * 60);
    
    if (hoursUntilClose > 0 && hoursUntilClose < 24) score += 0.2;
    else if (hoursUntilClose > 0 && hoursUntilClose < 168) score += 0.15;
    else if (hoursUntilClose > 0 && hoursUntilClose < 720) score += 0.1;
    
    // Kalshi verification (0-0.1)
    if (market.status === 'active' || market.status === 'open') score += 0.1;
    
    return Math.min(score, 1);
  }

  /**
   * Determine time category
   */
  getTimeCategory(market) {
    const closeTime = new Date(market.close_time);
    const openTime = new Date(market.open_time || market.created_time);
    const duration = closeTime - openTime;
    const hours = duration / (1000 * 60 * 60);
    
    if (hours <= 1) return 'hourly';
    if (hours <= 24) return 'daily';
    if (hours <= 168) return 'weekly';
    if (hours <= 720) return 'monthly';
    return 'other';
  }

  /**
   * Extract sport type from Kalshi market
   */
  getSportType(market) {
    const series = (market.series_ticker || '').toLowerCase();
    const title = (market.title || '').toLowerCase();
    const category = (market.category || '').toLowerCase();
    
    // Kalshi sports series identifiers
    if (series.includes('nfl') || title.includes('nfl')) return 'nfl';
    if (series.includes('nba') || title.includes('nba')) return 'nba';
    if (series.includes('mlb') || title.includes('baseball')) return 'mlb';
    if (series.includes('epl') || series.includes('soccer')) return 'soccer';
    if (series.includes('ufc') || title.includes('ufc')) return 'mma';
    
    // Check category
    if (category === 'sports') {
      if (title.includes('football')) return 'nfl';
      if (title.includes('basketball')) return 'nba';
      // Add more sports detection
    }
    
    return null;
  }

  /**
   * Fetch markets from Kalshi
   */
  async fetchMarkets(limit = 100) {
    try {
      console.log('🔍 Fetching markets from Kalshi...');
      
      // Using public election API as example
      // For production, use the trading API with proper auth
      const response = await axios.get(`${this.baseUrl}/markets`, {
        params: {
          limit,
          status: 'open'
        }
      });
      
      const markets = response.data?.markets || [];
      
      // If no markets from election API, try to get from cached/example data
      if (markets.length === 0) {
        console.log('No live markets found, using example Kalshi market structure');
        // Return example structure for development
        return this.getExampleMarkets();
      }
      
      console.log(`✅ Fetched ${markets.length} markets from Kalshi`);
      return markets;
    } catch (error) {
      console.error('Error fetching Kalshi markets:', error.message);
      
      // Return example markets for development
      return this.getExampleMarkets();
    }
  }

  /**
   * Get example Kalshi markets for development
   */
  getExampleMarkets() {
    return [
      {
        ticker: 'NFL-CHI-GB-2024',
        title: 'Will the Chicago Bears beat the Green Bay Packers?',
        series_ticker: 'NFL',
        category: 'Sports',
        subtitle: 'NFL Week 18',
        yes_bid: 0.45,
        yes_ask: 0.47,
        no_bid: 0.53,
        no_ask: 0.55,
        open_time: new Date().toISOString(),
        close_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        expiration_time: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active',
        volume: 125000,
        open_interest: 75000
      },
      {
        ticker: 'DAILY-BTC-70K',
        title: 'Will Bitcoin close above $70,000 today?',
        series_ticker: 'CRYPTO',
        category: 'Crypto',
        subtitle: 'Daily Bitcoin',
        yes_bid: 0.22,
        yes_ask: 0.24,
        no_bid: 0.76,
        no_ask: 0.78,
        open_time: new Date().toISOString(),
        close_time: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
        expiration_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        status: 'active',
        volume: 450000,
        open_interest: 200000
      }
    ];
  }

  /**
   * Transform Kalshi market to our schema
   */
  transformMarket(kalshiMarket) {
    // Kalshi markets are binary (Yes/No)
    const options = ['Yes', 'No'];
    
    const optionsMetadata = [
      {
        name: 'Yes',
        price: kalshiMarket.yes_ask || kalshiMarket.last_yes_price || 0.5,
        bid: kalshiMarket.yes_bid,
        ask: kalshiMarket.yes_ask
      },
      {
        name: 'No',
        price: kalshiMarket.no_ask || kalshiMarket.last_no_price || 0.5,
        bid: kalshiMarket.no_bid,
        ask: kalshiMarket.no_ask
      }
    ];
    
    // Extract event date (for sports/events, often close to close_time)
    let eventDate = null;
    if (kalshiMarket.event_time) {
      eventDate = kalshiMarket.event_time;
    } else if (kalshiMarket.category === 'Sports') {
      eventDate = kalshiMarket.close_time;
    }
    
    return {
      source: this.sourceName,
      source_id: kalshiMarket.ticker,
      question: kalshiMarket.title,
      description: kalshiMarket.subtitle || kalshiMarket.title,
      category: kalshiMarket.category || 'General',
      sport_type: this.getSportType(kalshiMarket),
      options: options,
      options_metadata: optionsMetadata,
      assets: {
        series: kalshiMarket.series_ticker,
        rules: kalshiMarket.rules_uri
      },
      event_date: eventDate,
      end_time: kalshiMarket.close_time,
      time_category: this.getTimeCategory(kalshiMarket),
      source_url: `https://kalshi.com/markets/${kalshiMarket.ticker}`,
      source_data: kalshiMarket,
      quality_score: this.calculateQualityScore(kalshiMarket)
    };
  }

  /**
   * Scrape and save Kalshi markets
   */
  async scrapeAndSave() {
    const startTime = Date.now();
    console.log(`🚀 Starting Kalshi scrape at ${new Date().toISOString()}`);
    
    try {
      // Authenticate if needed
      await this.authenticate();
      
      // Fetch markets
      const markets = await this.fetchMarkets(100);
      
      let saved = 0;
      let duplicates = 0;
      let errors = 0;
      
      for (const market of markets) {
        try {
          const transformed = this.transformMarket(market);
          
          // Check if already exists
          const existing = await db.query(
            'SELECT id FROM scraped_markets WHERE source = $1 AND source_id = $2',
            [this.sourceName, transformed.source_id]
          );
          
          if (existing.rows.length > 0) {
            duplicates++;
            
            // Update quality score if market still active
            await db.query(
              'UPDATE scraped_markets SET quality_score = $1, source_data = $2 WHERE source = $3 AND source_id = $4',
              [transformed.quality_score, JSON.stringify(transformed.source_data), this.sourceName, transformed.source_id]
            );
            continue;
          }
          
          // Insert into scraped_markets
          await db.query(`
            INSERT INTO scraped_markets (
              source, source_id, question, description, category, sport_type,
              options, options_metadata, assets, event_date, end_time,
              time_category, source_url, source_data, quality_score
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          `, [
            transformed.source,
            transformed.source_id,
            transformed.question,
            transformed.description,
            transformed.category,
            transformed.sport_type,
            JSON.stringify(transformed.options),
            JSON.stringify(transformed.options_metadata),
            JSON.stringify(transformed.assets),
            transformed.event_date,
            transformed.end_time,
            transformed.time_category,
            transformed.source_url,
            JSON.stringify(transformed.source_data),
            transformed.quality_score
          ]);
          
          saved++;
        } catch (error) {
          console.error(`Error saving Kalshi market ${market.title}:`, error.message);
          errors++;
        }
      }
      
      // Update last scraped timestamp
      await db.query(
        'UPDATE market_sources SET last_scraped_at = NOW(), total_markets_scraped = total_markets_scraped + $1 WHERE name = $2',
        [saved, this.sourceName]
      );
      
      const duration = Date.now() - startTime;
      console.log(`✅ Kalshi scrape completed in ${duration}ms`);
      console.log(`📊 Saved: ${saved}, Duplicates: ${duplicates}, Errors: ${errors}`);
      
      return { saved, duplicates, errors, duration };
    } catch (error) {
      console.error('Kalshi scrape failed:', error);
      throw error;
    }
  }

  /**
   * Get high quality Kalshi markets
   */
  async getHighQualityMarkets() {
    const result = await db.query(`
      SELECT * FROM scraped_markets 
      WHERE source = $1 
        AND approval_status = 'pending'
        AND quality_score >= 0.6
        AND end_time > NOW()
      ORDER BY quality_score DESC, scraped_at DESC
      LIMIT 50
    `, [this.sourceName]);
    
    return result.rows;
  }
}

module.exports = new KalshiScraper();