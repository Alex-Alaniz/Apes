#!/usr/bin/env node

const { Pool } = require('pg');

const POLYMARKET_DB_URL = 'postgresql://neondb_owner:npg_qht1Er7SFAIn@ep-proud-snow-a4l83fqg.us-east-1.aws.neon.tech/neondb?sslmode=require';

class PolymarketMarketAnalyzer {
  constructor() {
    this.pool = new Pool({
      connectionString: POLYMARKET_DB_URL,
      ssl: { rejectUnauthorized: false }
    });
  }

  async analyzeMarkets() {
    console.log('📊 Analyzing Polymarket Markets Data...\n');
    
    // Get markets with market_id (potential ApeChain ID)
    console.log('🔍 Markets with market_id field:');
    const marketsWithId = await this.pool.query(`
      SELECT 
        poly_id,
        market_id,
        question,
        category,
        market_type,
        status,
        end_time,
        deployed_at
      FROM markets 
      WHERE market_id IS NOT NULL
      ORDER BY deployed_at DESC
      LIMIT 10
    `);
    
    if (marketsWithId.rows.length > 0) {
      console.log(`Found ${marketsWithId.rows.length} markets with market_id:\n`);
      marketsWithId.rows.forEach((market, i) => {
        console.log(`${i + 1}. ${market.question}`);
        console.log(`   Poly ID: ${market.poly_id}`);
        console.log(`   Market ID: ${market.market_id}`);
        console.log(`   Status: ${market.status}`);
        console.log(`   End Time: ${market.end_time}`);
        console.log(`   Deployed: ${market.deployed_at}\n`);
      });
    } else {
      console.log('No markets found with market_id\n');
    }
    
    // Get market statuses
    console.log('📈 Market Status Distribution:');
    const statusCount = await this.pool.query(`
      SELECT status, COUNT(*) as count 
      FROM markets 
      GROUP BY status 
      ORDER BY count DESC
    `);
    
    statusCount.rows.forEach(row => {
      console.log(`   ${row.status || 'null'}: ${row.count} markets`);
    });
    
    // Get recent approved markets
    console.log('\n✅ Recently Approved Markets:');
    const recentApproved = await this.pool.query(`
      SELECT 
        m.poly_id,
        m.question,
        m.market_id,
        m.end_time,
        m.status,
        COUNT(mo.id) as option_count
      FROM markets m
      LEFT JOIN market_options mo ON m.poly_id = mo.market_poly_id
      WHERE m.final_approved_at IS NOT NULL
      GROUP BY m.poly_id
      ORDER BY m.final_approved_at DESC
      LIMIT 5
    `);
    
    for (const market of recentApproved.rows) {
      console.log(`\n${market.question}`);
      console.log(`   Poly ID: ${market.poly_id}`);
      console.log(`   Market ID: ${market.market_id || 'Not set'}`);
      console.log(`   Options: ${market.option_count}`);
      console.log(`   End Time: ${market.end_time}`);
      
      // Get options for this market
      const options = await this.pool.query(`
        SELECT label, icon 
        FROM market_options 
        WHERE market_poly_id = $1
        ORDER BY id
      `, [market.poly_id]);
      
      if (options.rows.length > 0) {
        console.log('   Options:', options.rows.map(o => o.label).join(', '));
      }
    }
    
    // Sample market with full details
    console.log('\n📋 Sample Market Full Details:');
    const sampleMarket = await this.pool.query(`
      SELECT * FROM markets 
      WHERE question IS NOT NULL 
      AND banner IS NOT NULL
      ORDER BY poly_id DESC 
      LIMIT 1
    `);
    
    if (sampleMarket.rows.length > 0) {
      console.log(JSON.stringify(sampleMarket.rows[0], null, 2));
    }
  }
  
  async searchActiveMarkets() {
    console.log('\n🎯 Searching for Active/Deployable Markets...');
    
    const activeMarkets = await this.pool.query(`
      SELECT 
        m.*,
        json_agg(
          json_build_object(
            'label', mo.label,
            'icon', mo.icon,
            'option_poly_id', mo.option_poly_id
          ) ORDER BY mo.id
        ) as options
      FROM markets m
      LEFT JOIN market_options mo ON m.poly_id = mo.market_poly_id
      WHERE 
        m.end_time > NOW()
        AND m.status != 'rejected'
        AND m.question IS NOT NULL
      GROUP BY m.poly_id
      ORDER BY m.end_time ASC
      LIMIT 10
    `);
    
    console.log(`\nFound ${activeMarkets.rows.length} active markets:\n`);
    
    activeMarkets.rows.forEach((market, i) => {
      console.log(`${i + 1}. ${market.question}`);
      console.log(`   Poly ID: ${market.poly_id}`);
      console.log(`   Market ID: ${market.market_id || 'None'}`);
      console.log(`   End Time: ${new Date(market.end_time).toLocaleString()}`);
      console.log(`   Status: ${market.status}`);
      console.log(`   Options: ${market.options.map(o => o.label).join(', ')}`);
      console.log(`   Banner: ${market.banner ? '✓' : '✗'}`);
      console.log('');
    });
  }
  
  async close() {
    await this.pool.end();
  }
}

// Main
async function main() {
  const analyzer = new PolymarketMarketAnalyzer();
  
  try {
    await analyzer.analyzeMarkets();
    await analyzer.searchActiveMarkets();
    
    console.log('\n✨ Analysis complete!');
    console.log('\n💡 Next Steps:');
    console.log('1. The "market_id" field appears to be the ApeChain market ID');
    console.log('2. Use poly_id to join with market_options table');
    console.log('3. Filter by end_time > NOW() for active markets');
    console.log('4. Check status field for deployment readiness');
    
  } catch (error) {
    console.error('💥 Error:', error);
  } finally {
    await analyzer.close();
  }
}

main().catch(console.error); 