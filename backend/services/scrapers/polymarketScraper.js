const axios = require('axios');
const { ethers } = require('ethers');
const db = require('../../config/database');

class PolymarketScraper {
  constructor() {
    this.apiUrl = 'https://clob.polymarket.com/markets';
    this.dataUrl = 'https://data-api.polymarket.com/markets';
    this.polygonRpc = process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com';
    this.provider = new ethers.providers.JsonRpcProvider(this.polygonRpc);
    this.sourceName = 'polymarket';
  }

  /**
   * Calculate quality score for a market
   */
  calculateQualityScore(market) {
    let score = 0;
    
    // Volume factor (0-0.3)
    if (market.volume) {
      const volume = parseFloat(market.volume);
      if (volume > 100000) score += 0.3;
      else if (volume > 50000) score += 0.25;
      else if (volume > 10000) score += 0.2;
      else if (volume > 1000) score += 0.1;
    }
    
    // Liquidity factor (0-0.2)
    if (market.liquidity) {
      const liquidity = parseFloat(market.liquidity);
      if (liquidity > 50000) score += 0.2;
      else if (liquidity > 20000) score += 0.15;
      else if (liquidity > 5000) score += 0.1;
    }
    
    // Time relevance (0-0.2)
    const endDate = new Date(market.end_date_iso || market.closed_time);
    const now = new Date();
    const hoursUntilEnd = (endDate - now) / (1000 * 60 * 60);
    
    if (hoursUntilEnd > 0 && hoursUntilEnd < 168) { // Within a week
      score += 0.2;
    } else if (hoursUntilEnd > 0 && hoursUntilEnd < 720) { // Within a month
      score += 0.1;
    }
    
    // Engagement factor (0-0.2)
    if (market.num_traders && market.num_traders > 100) score += 0.1;
    if (market.comments_count && market.comments_count > 50) score += 0.1;
    
    // Clear binary options (0-0.1)
    if (market.outcomes && market.outcomes.length === 2) score += 0.1;
    
    return Math.min(score, 1);
  }

  /**
   * Determine time category based on market duration
   */
  getTimeCategory(market) {
    const endDate = new Date(market.end_date_iso || market.closed_time);
    const startDate = new Date(market.created_at || market.start_date_iso);
    const duration = endDate - startDate;
    const hours = duration / (1000 * 60 * 60);
    
    if (hours <= 1) return 'hourly';
    if (hours <= 24) return 'daily';
    if (hours <= 168) return 'weekly';
    if (hours <= 720) return 'monthly';
    return 'other';
  }

  /**
   * Extract sport type from market tags/category
   */
  getSportType(market) {
    const tags = market.tags || [];
    const category = (market.category || '').toLowerCase();
    const question = (market.question || '').toLowerCase();
    
    // Check tags first
    for (const tag of tags) {
      const lowerTag = tag.toLowerCase();
      if (lowerTag.includes('nfl') || lowerTag.includes('football')) return 'nfl';
      if (lowerTag.includes('nba') || lowerTag.includes('basketball')) return 'nba';
      if (lowerTag.includes('mlb') || lowerTag.includes('baseball')) return 'mlb';
      if (lowerTag.includes('soccer') || lowerTag.includes('football')) return 'soccer';
      if (lowerTag.includes('ufc') || lowerTag.includes('mma')) return 'mma';
      if (lowerTag.includes('tennis')) return 'tennis';
      if (lowerTag.includes('f1') || lowerTag.includes('formula')) return 'f1';
    }
    
    // Check category/question
    if (category.includes('sports') || question.includes('game') || question.includes('match')) {
      // Try to extract from question
      if (question.includes('nfl') || question.includes('football')) return 'nfl';
      if (question.includes('nba') || question.includes('basketball')) return 'nba';
      // ... etc
    }
    
    return null;
  }

  /**
   * Fetch markets from Polymarket API
   */
  async fetchMarkets(limit = 100, active = true) {
    try {
      console.log(`🔍 Fetching ${active ? 'active' : 'all'} markets from Polymarket...`);
      
      // Use data API for better market data
      const params = {
        limit,
        active: active ? 'true' : 'false',
        closed: 'false',
        order: 'volume',
        ascending: 'false'
      };
      
      const response = await axios.get(this.dataUrl, { params });
      const markets = response.data || [];
      
      console.log(`✅ Fetched ${markets.length} markets from Polymarket`);
      return markets;
    } catch (error) {
      console.error('Error fetching Polymarket markets:', error.message);
      throw error;
    }
  }

  /**
   * Transform Polymarket data to our schema
   */
  transformMarket(polyMarket) {
    const outcomes = polyMarket.outcomes || polyMarket.tokens || [];
    const options = outcomes.map(o => ({
      name: o.outcome || o.name,
      id: o.id,
      price: o.price
    }));
    
    // Extract event date from question or tags
    let eventDate = null;
    const endDate = polyMarket.end_date_iso || polyMarket.closed_time;
    
    // For sports/events, the event date is often the end date
    if (polyMarket.category === 'Sports' || polyMarket.tags?.includes('Sports')) {
      eventDate = endDate;
    }
    
    return {
      source: this.sourceName,
      source_id: polyMarket.condition_id || polyMarket.id,
      question: polyMarket.question,
      description: polyMarket.description || polyMarket.question,
      category: polyMarket.category || 'General',
      sport_type: this.getSportType(polyMarket),
      options: options.map(o => o.name),
      options_metadata: options,
      assets: {
        image: polyMarket.image,
        icon: polyMarket.icon
      },
      event_date: eventDate,
      end_time: endDate,
      time_category: this.getTimeCategory(polyMarket),
      source_url: `https://polymarket.com/market/${polyMarket.slug || polyMarket.condition_id}`,
      source_data: polyMarket,
      quality_score: this.calculateQualityScore(polyMarket)
    };
  }

  /**
   * Check onchain data for a market (if needed)
   */
  async getOnchainData(conditionId) {
    try {
      // Polymarket uses Gnosis conditional tokens on Polygon
      // Add onchain verification if needed
      return null;
    } catch (error) {
      console.error('Error fetching onchain data:', error);
      return null;
    }
  }

  /**
   * Scrape and save markets
   */
  async scrapeAndSave() {
    const startTime = Date.now();
    console.log(`🚀 Starting Polymarket scrape at ${new Date().toISOString()}`);
    
    try {
      // Fetch active markets
      const markets = await this.fetchMarkets(200, true);
      
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
          console.error(`Error saving market ${market.question}:`, error.message);
          errors++;
        }
      }
      
      // Update last scraped timestamp
      await db.query(
        'UPDATE market_sources SET last_scraped_at = NOW(), total_markets_scraped = total_markets_scraped + $1 WHERE name = $2',
        [saved, this.sourceName]
      );
      
      const duration = Date.now() - startTime;
      console.log(`✅ Polymarket scrape completed in ${duration}ms`);
      console.log(`📊 Saved: ${saved}, Duplicates: ${duplicates}, Errors: ${errors}`);
      
      return { saved, duplicates, errors, duration };
    } catch (error) {
      console.error('Polymarket scrape failed:', error);
      throw error;
    }
  }

  /**
   * Get high quality markets for auto-approval
   */
  async getHighQualityMarkets() {
    const result = await db.query(`
      SELECT * FROM scraped_markets 
      WHERE source = $1 
        AND approval_status = 'pending'
        AND quality_score >= 0.7
        AND end_time > NOW()
      ORDER BY quality_score DESC, scraped_at DESC
      LIMIT 50
    `, [this.sourceName]);
    
    return result.rows;
  }
}

module.exports = new PolymarketScraper();