const axios = require('axios');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const db = require('../../config/database');

// Use stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

class FanDuelScraper {
  constructor() {
    this.baseUrl = 'https://sportsbook.fanduel.com';
    this.apiUrl = 'https://sbapi.ny.sportsbook.fanduel.com/api';
    this.sourceName = 'fanduel';
    this.browser = null;
  }

  /**
   * Initialize browser for scraping
   */
  async initBrowser() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }
    return this.browser;
  }

  /**
   * Close browser
   */
  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Calculate quality score for FanDuel markets
   */
  calculateQualityScore(market) {
    let score = 0;
    
    // Popular sports get higher scores
    const sport = market.sport_type || '';
    if (['nfl', 'nba', 'mlb', 'nhl'].includes(sport)) score += 0.2;
    else if (['soccer', 'tennis', 'golf'].includes(sport)) score += 0.15;
    else score += 0.1;
    
    // Market type factor
    if (market.market_type === 'moneyline' || market.market_type === 'spread') score += 0.2;
    else if (market.market_type === 'total') score += 0.15;
    else score += 0.1;
    
    // Odds balance (closer to even odds = better)
    if (market.options_metadata) {
      const odds = market.options_metadata.map(o => o.decimal_odds || 2);
      const avgOdds = odds.reduce((a, b) => a + b, 0) / odds.length;
      if (avgOdds >= 1.8 && avgOdds <= 2.2) score += 0.2;
      else if (avgOdds >= 1.5 && avgOdds <= 2.5) score += 0.15;
      else score += 0.1;
    }
    
    // Time until event
    const eventTime = new Date(market.event_date);
    const now = new Date();
    const hoursUntilEvent = (eventTime - now) / (1000 * 60 * 60);
    
    if (hoursUntilEvent > 0 && hoursUntilEvent < 24) score += 0.2;
    else if (hoursUntilEvent > 0 && hoursUntilEvent < 72) score += 0.15;
    else if (hoursUntilEvent > 0 && hoursUntilEvent < 168) score += 0.1;
    
    // Featured/promoted markets
    if (market.is_featured || market.is_boosted) score += 0.1;
    
    return Math.min(score, 1);
  }

  /**
   * Get time category for market
   */
  getTimeCategory(eventDate) {
    const now = new Date();
    const event = new Date(eventDate);
    const hoursUntilEvent = (event - now) / (1000 * 60 * 60);
    
    if (hoursUntilEvent <= 1) return 'hourly';
    if (hoursUntilEvent <= 24) return 'daily';
    if (hoursUntilEvent <= 168) return 'weekly';
    if (hoursUntilEvent <= 720) return 'monthly';
    return 'other';
  }

  /**
   * Convert American odds to decimal
   */
  americanToDecimal(american) {
    if (american > 0) {
      return (american / 100) + 1;
    } else {
      return (100 / Math.abs(american)) + 1;
    }
  }

  /**
   * Create binary question from FanDuel market
   */
  createBinaryQuestion(market, selection) {
    const eventName = `${market.away_team} @ ${market.home_team}`;
    
    switch (market.market_type) {
      case 'moneyline':
        return `Will ${selection.name} win the game?`;
      
      case 'spread':
        const spread = selection.handicap > 0 ? `+${selection.handicap}` : selection.handicap;
        return `Will ${selection.name} cover ${spread}?`;
      
      case 'total':
        const overUnder = selection.name.toLowerCase().includes('over') ? 'over' : 'under';
        return `Will the total score go ${overUnder} ${selection.handicap}?`;
      
      case 'player_prop':
        return `Will ${market.player_name} ${market.prop_type} ${selection.name}?`;
      
      default:
        return `${eventName}: ${selection.name}`;
    }
  }

  /**
   * Fetch live odds via API (if available)
   */
  async fetchOddsAPI(sport = 'nfl') {
    try {
      // Try to fetch from FanDuel's API endpoints
      const endpoints = {
        nfl: '/content-managed-page/nfl',
        nba: '/content-managed-page/nba',
        mlb: '/content-managed-page/mlb',
        nhl: '/content-managed-page/nhl'
      };
      
      const response = await axios.get(`${this.apiUrl}${endpoints[sport]}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      return response.data;
    } catch (error) {
      console.log('API fetch failed, will use web scraping:', error.message);
      return null;
    }
  }

  /**
   * Scrape markets from FanDuel website
   */
  async scrapeMarkets(sport = 'nfl', limit = 50) {
    const browser = await this.initBrowser();
    const page = await browser.newPage();
    
    try {
      console.log(`🔍 Scraping ${sport.toUpperCase()} markets from FanDuel...`);
      
      // Navigate to sport page
      await page.goto(`${this.baseUrl}/${sport}`, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      
      // Wait for markets to load
      await page.waitForSelector('[class*="event-cell"]', { timeout: 10000 });
      
      // Extract market data
      const markets = await page.evaluate(() => {
        const marketElements = document.querySelectorAll('[class*="event-cell"]');
        const extractedMarkets = [];
        
        marketElements.forEach((element, index) => {
          if (index >= 50) return; // Limit
          
          try {
            // Extract teams
            const teamElements = element.querySelectorAll('[class*="team-name"]');
            const awayTeam = teamElements[0]?.textContent?.trim();
            const homeTeam = teamElements[1]?.textContent?.trim();
            
            // Extract odds
            const oddsElements = element.querySelectorAll('[class*="odds-button"]');
            const moneylineOdds = [];
            const spreadOdds = [];
            const totalOdds = [];
            
            oddsElements.forEach(oddsEl => {
              const odds = oddsEl.textContent?.trim();
              const market = oddsEl.closest('[class*="market-type"]');
              
              if (market?.textContent?.includes('Moneyline')) {
                moneylineOdds.push(odds);
              } else if (market?.textContent?.includes('Spread')) {
                spreadOdds.push(odds);
              } else if (market?.textContent?.includes('Total')) {
                totalOdds.push(odds);
              }
            });
            
            // Extract event time
            const timeElement = element.querySelector('[class*="event-time"]');
            const eventTime = timeElement?.textContent?.trim();
            
            if (awayTeam && homeTeam) {
              extractedMarkets.push({
                away_team: awayTeam,
                home_team: homeTeam,
                moneyline_odds: moneylineOdds,
                spread_odds: spreadOdds,
                total_odds: totalOdds,
                event_time: eventTime,
                sport: 'nfl' // Will be set dynamically
              });
            }
          } catch (err) {
            console.error('Error extracting market:', err);
          }
        });
        
        return extractedMarkets;
      });
      
      console.log(`✅ Scraped ${markets.length} markets from FanDuel`);
      return markets;
      
    } catch (error) {
      console.error('Error scraping FanDuel:', error);
      // Return example markets for development
      return this.getExampleMarkets(sport);
    } finally {
      await page.close();
    }
  }

  /**
   * Get example markets for development
   */
  getExampleMarkets(sport) {
    const examples = {
      nfl: [
        {
          away_team: 'Kansas City Chiefs',
          home_team: 'Buffalo Bills',
          moneyline_odds: ['-150', '+130'],
          spread_odds: ['-3 -110', '+3 -110'],
          total_odds: ['O 48.5 -110', 'U 48.5 -110'],
          event_time: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          sport: 'nfl'
        }
      ],
      nba: [
        {
          away_team: 'Los Angeles Lakers',
          home_team: 'Boston Celtics',
          moneyline_odds: ['+180', '-220'],
          spread_odds: ['+6.5 -110', '-6.5 -110'],
          total_odds: ['O 225.5 -110', 'U 225.5 -110'],
          event_time: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
          sport: 'nba'
        }
      ]
    };
    
    return examples[sport] || examples.nfl;
  }

  /**
   * Transform FanDuel market to multiple binary markets
   */
  transformToMarkets(fanduelData) {
    const markets = [];
    const eventDate = new Date(fanduelData.event_time);
    const eventName = `${fanduelData.away_team} @ ${fanduelData.home_team}`;
    
    // Moneyline market
    if (fanduelData.moneyline_odds?.length === 2) {
      markets.push({
        source: this.sourceName,
        source_id: `${fanduelData.sport}_${fanduelData.away_team}_${fanduelData.home_team}_ML`.replace(/\s+/g, '_'),
        question: `Will ${fanduelData.away_team} beat ${fanduelData.home_team}?`,
        description: `${eventName} - Moneyline`,
        category: 'Sports',
        sport_type: fanduelData.sport,
        options: ['Yes', 'No'],
        options_metadata: [
          {
            name: 'Yes',
            american_odds: fanduelData.moneyline_odds[0],
            decimal_odds: this.americanToDecimal(parseInt(fanduelData.moneyline_odds[0]))
          },
          {
            name: 'No',
            american_odds: fanduelData.moneyline_odds[1],
            decimal_odds: this.americanToDecimal(parseInt(fanduelData.moneyline_odds[1]))
          }
        ],
        assets: {
          teams: { away: fanduelData.away_team, home: fanduelData.home_team },
          market_type: 'moneyline'
        },
        event_date: eventDate,
        end_time: eventDate,
        time_category: this.getTimeCategory(eventDate),
        source_url: `${this.baseUrl}/${fanduelData.sport}`,
        source_data: fanduelData,
        quality_score: 0
      });
    }
    
    // Spread markets (if available)
    if (fanduelData.spread_odds?.length === 2) {
      const spreadMatch = fanduelData.spread_odds[0].match(/([+-]?\d+\.?\d*)/);
      if (spreadMatch) {
        const spread = parseFloat(spreadMatch[1]);
        markets.push({
          source: this.sourceName,
          source_id: `${fanduelData.sport}_${fanduelData.away_team}_${fanduelData.home_team}_SPREAD`.replace(/\s+/g, '_'),
          question: `Will ${fanduelData.away_team} cover ${spread > 0 ? '+' : ''}${spread}?`,
          description: `${eventName} - Spread`,
          category: 'Sports',
          sport_type: fanduelData.sport,
          options: ['Yes', 'No'],
          options_metadata: [
            { name: 'Yes', line: spread, odds: '-110' },
            { name: 'No', line: -spread, odds: '-110' }
          ],
          assets: {
            teams: { away: fanduelData.away_team, home: fanduelData.home_team },
            market_type: 'spread',
            line: spread
          },
          event_date: eventDate,
          end_time: eventDate,
          time_category: this.getTimeCategory(eventDate),
          source_url: `${this.baseUrl}/${fanduelData.sport}`,
          source_data: fanduelData,
          quality_score: 0
        });
      }
    }
    
    // Total markets (if available)
    if (fanduelData.total_odds?.length === 2) {
      const totalMatch = fanduelData.total_odds[0].match(/(\d+\.?\d*)/);
      if (totalMatch) {
        const total = parseFloat(totalMatch[1]);
        markets.push({
          source: this.sourceName,
          source_id: `${fanduelData.sport}_${fanduelData.away_team}_${fanduelData.home_team}_TOTAL`.replace(/\s+/g, '_'),
          question: `Will the total score be over ${total}?`,
          description: `${eventName} - Total Points`,
          category: 'Sports',
          sport_type: fanduelData.sport,
          options: ['Yes', 'No'],
          options_metadata: [
            { name: 'Yes', line: total, type: 'over', odds: '-110' },
            { name: 'No', line: total, type: 'under', odds: '-110' }
          ],
          assets: {
            teams: { away: fanduelData.away_team, home: fanduelData.home_team },
            market_type: 'total',
            line: total
          },
          event_date: eventDate,
          end_time: eventDate,
          time_category: this.getTimeCategory(eventDate),
          source_url: `${this.baseUrl}/${fanduelData.sport}`,
          source_data: fanduelData,
          quality_score: 0
        });
      }
    }
    
    // Calculate quality scores
    markets.forEach(market => {
      market.quality_score = this.calculateQualityScore(market);
    });
    
    return markets;
  }

  /**
   * Scrape and save markets
   */
  async scrapeAndSave(sports = ['nfl', 'nba', 'mlb']) {
    const startTime = Date.now();
    console.log(`🚀 Starting FanDuel scrape at ${new Date().toISOString()}`);
    
    let totalSaved = 0;
    let totalDuplicates = 0;
    let totalErrors = 0;
    
    try {
      for (const sport of sports) {
        console.log(`📊 Scraping ${sport.toUpperCase()} markets...`);
        
        // Try API first, fall back to scraping
        let rawMarkets = await this.fetchOddsAPI(sport);
        
        if (!rawMarkets) {
          rawMarkets = await this.scrapeMarkets(sport, 30);
        }
        
        for (const rawMarket of rawMarkets) {
          const transformedMarkets = this.transformToMarkets(rawMarket);
          
          for (const market of transformedMarkets) {
            try {
              // Check if already exists
              const existing = await db.query(
                'SELECT id FROM scraped_markets WHERE source = $1 AND source_id = $2',
                [this.sourceName, market.source_id]
              );
              
              if (existing.rows.length > 0) {
                totalDuplicates++;
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
                market.source,
                market.source_id,
                market.question,
                market.description,
                market.category,
                market.sport_type,
                JSON.stringify(market.options),
                JSON.stringify(market.options_metadata),
                JSON.stringify(market.assets),
                market.event_date,
                market.end_time,
                market.time_category,
                market.source_url,
                JSON.stringify(market.source_data),
                market.quality_score
              ]);
              
              totalSaved++;
            } catch (error) {
              console.error(`Error saving market:`, error.message);
              totalErrors++;
            }
          }
        }
      }
      
      // Update last scraped timestamp
      await db.query(
        'UPDATE market_sources SET last_scraped_at = NOW(), total_markets_scraped = total_markets_scraped + $1 WHERE name = $2',
        [totalSaved, this.sourceName]
      );
      
      const duration = Date.now() - startTime;
      console.log(`✅ FanDuel scrape completed in ${duration}ms`);
      console.log(`📊 Saved: ${totalSaved}, Duplicates: ${totalDuplicates}, Errors: ${totalErrors}`);
      
      return { saved: totalSaved, duplicates: totalDuplicates, errors: totalErrors, duration };
    } catch (error) {
      console.error('FanDuel scrape failed:', error);
      throw error;
    } finally {
      await this.closeBrowser();
    }
  }

  /**
   * Get high quality sports markets
   */
  async getHighQualityMarkets() {
    const result = await db.query(`
      SELECT * FROM scraped_markets 
      WHERE source = $1 
        AND approval_status = 'pending'
        AND quality_score >= 0.65
        AND sport_type IS NOT NULL
        AND event_date > NOW()
      ORDER BY quality_score DESC, event_date ASC
      LIMIT 50
    `, [this.sourceName]);
    
    return result.rows;
  }
}

module.exports = new FanDuelScraper();