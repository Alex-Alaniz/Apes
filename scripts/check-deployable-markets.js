#!/usr/bin/env node

const { Pool } = require('pg');

const POLYMARKET_DB_URL = 'postgresql://neondb_owner:npg_qht1Er7SFAIn@ep-proud-snow-a4l83fqg.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function checkDeployableMarkets() {
  const pool = new Pool({
    connectionString: POLYMARKET_DB_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('📊 Checking Deployable Markets\n');
    
    // Count markets by status
    const statusQuery = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE market_id IS NOT NULL) as has_apechain_id,
        COUNT(*) FILTER (WHERE market_id IS NOT NULL AND status = 'live') as live_on_apechain,
        COUNT(*) FILTER (WHERE market_id IS NOT NULL AND status = 'live' AND end_time > NOW()) as deployable,
        COUNT(*) FILTER (WHERE end_time < NOW()) as expired,
        COUNT(*) as total
      FROM markets
    `);
    
    const stats = statusQuery.rows[0];
    console.log('Market Statistics:');
    console.log(`  Total markets: ${stats.total}`);
    console.log(`  Has ApeChain ID: ${stats.has_apechain_id}`);
    console.log(`  Live on ApeChain: ${stats.live_on_apechain}`);
    console.log(`  Deployable (live + not expired): ${stats.deployable}`);
    console.log(`  Expired: ${stats.expired}`);
    
    // Show sample of deployable markets
    console.log('\n📋 Sample Deployable Markets:');
    const deployableQuery = await pool.query(`
      SELECT 
        m.poly_id,
        m.market_id as apechain_id,
        m.question,
        m.category,
        m.end_time,
        COUNT(mo.id) as option_count
      FROM markets m
      LEFT JOIN market_options mo ON m.poly_id = mo.market_poly_id
      WHERE 
        m.market_id IS NOT NULL
        AND m.status = 'live'
        AND m.end_time > NOW()
      GROUP BY m.poly_id
      ORDER BY m.end_time ASC
      LIMIT 5
    `);
    
    deployableQuery.rows.forEach((market, i) => {
      console.log(`\n${i + 1}. ${market.question}`);
      console.log(`   Poly ID: ${market.poly_id}`);
      console.log(`   ApeChain ID: ${market.apechain_id}`);
      console.log(`   Category: ${market.category || 'N/A'}`);
      console.log(`   Options: ${market.option_count}`);
      console.log(`   Ends: ${new Date(market.end_time).toLocaleString()}`);
    });
    
    // Check markets by category
    console.log('\n📊 Deployable Markets by Category:');
    const categoryQuery = await pool.query(`
      SELECT 
        COALESCE(category, 'uncategorized') as category,
        COUNT(*) as count
      FROM markets
      WHERE 
        market_id IS NOT NULL
        AND status = 'live'
        AND end_time > NOW()
      GROUP BY category
      ORDER BY count DESC
    `);
    
    categoryQuery.rows.forEach(cat => {
      console.log(`  ${cat.category}: ${cat.count} markets`);
    });
    
    console.log('\n✅ Ready for deployment!');
    console.log('\nTo deploy markets, run:');
    console.log('  node scripts/polymarket-to-solana-integration.js --limit 5 --skip-apechain');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkDeployableMarkets().catch(console.error); 