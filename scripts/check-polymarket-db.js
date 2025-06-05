const { Pool } = require('pg');
require('dotenv').config();

async function checkPolymarketDB() {
  const POLYMARKET_DB_URL = process.env.POLYMARKET_DB_URL || 'postgresql://neondb_owner:npg_qht1Er7SFAIn@ep-proud-snow-a4l83fqg.us-east-1.aws.neon.tech/neondb?sslmode=require';
  
  const pool = new Pool({
    connectionString: POLYMARKET_DB_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to Polymarket DB...\n');
    
    // Check total markets
    const totalQuery = 'SELECT COUNT(*) as total FROM markets';
    const totalResult = await pool.query(totalQuery);
    console.log(`Total markets in DB: ${totalResult.rows[0].total}`);
    
    // Check markets with banners
    const withBannersQuery = 'SELECT COUNT(*) as total FROM markets WHERE banner IS NOT NULL';
    const withBannersResult = await pool.query(withBannersQuery);
    console.log(`Markets with banners: ${withBannersResult.rows[0].total}`);
    
    // Check active markets
    const activeQuery = "SELECT COUNT(*) as total FROM markets WHERE status = 'live' AND end_time > NOW()";
    const activeResult = await pool.query(activeQuery);
    console.log(`Active markets: ${activeResult.rows[0].total}`);
    
    // Check markets with ApeChain ID
    const withApeChainQuery = 'SELECT COUNT(*) as total FROM markets WHERE market_id IS NOT NULL';
    const withApeChainResult = await pool.query(withApeChainQuery);
    console.log(`Markets with ApeChain ID: ${withApeChainResult.rows[0].total}`);
    
    // Get sample of recent markets with banners
    console.log('\n--- Sample Markets with Banners ---');
    const sampleQuery = `
      SELECT 
        poly_id,
        question,
        category,
        banner,
        end_time,
        status,
        market_id as apechain_id
      FROM markets 
      WHERE banner IS NOT NULL 
      ORDER BY end_time DESC 
      LIMIT 5
    `;
    const sampleResult = await pool.query(sampleQuery);
    
    sampleResult.rows.forEach((market, i) => {
      console.log(`\n${i + 1}. ${market.question}`);
      console.log(`   Poly ID: ${market.poly_id}`);
      console.log(`   Category: ${market.category || 'N/A'}`);
      console.log(`   Status: ${market.status}`);
      console.log(`   ApeChain ID: ${market.apechain_id || 'Not deployed'}`);
      console.log(`   Banner: ${market.banner ? '✓ Has banner' : '✗ No banner'}`);
      console.log(`   Ends: ${new Date(market.end_time).toLocaleDateString()}`);
    });
    
    // Check for markets with options
    console.log('\n--- Checking Market Options ---');
    const optionsQuery = `
      SELECT 
        m.poly_id,
        m.question,
        COUNT(mo.id) as option_count
      FROM markets m
      LEFT JOIN market_options mo ON m.poly_id = mo.market_poly_id
      WHERE m.banner IS NOT NULL
      GROUP BY m.poly_id
      ORDER BY m.end_time DESC
      LIMIT 5
    `;
    const optionsResult = await pool.query(optionsQuery);
    
    optionsResult.rows.forEach(market => {
      console.log(`${market.question.substring(0, 50)}... - ${market.option_count} options`);
    });
    
    // Check markets that are deployable (active + has options + has ApeChain ID)
    console.log('\n--- Deployable Markets ---');
    const deployableQuery = `
      SELECT 
        m.poly_id,
        m.question,
        m.category,
        m.market_id as apechain_id,
        m.status,
        m.end_time,
        COUNT(mo.id) as option_count
      FROM markets m
      LEFT JOIN market_options mo ON m.poly_id = mo.market_poly_id
      WHERE 
        m.banner IS NOT NULL
        AND m.market_id IS NOT NULL
        AND m.status = 'live'
        AND m.end_time > NOW()
      GROUP BY m.poly_id
      HAVING COUNT(mo.id) > 0
      ORDER BY m.end_time ASC
      LIMIT 10
    `;
    const deployableResult = await pool.query(deployableQuery);
    
    console.log(`\nFound ${deployableResult.rows.length} deployable markets:`);
    deployableResult.rows.forEach((market, i) => {
      console.log(`\n${i + 1}. ${market.question}`);
      console.log(`   Options: ${market.option_count}`);
      console.log(`   Category: ${market.category || 'general'}`);
      console.log(`   Ends: ${new Date(market.end_time).toLocaleDateString()}`);
    });
    
    // Check if markets_cache table exists (this is what's blocking deployments)
    console.log('\n--- Checking markets_cache Table ---');
    try {
      const cacheCheckQuery = `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'markets_cache'
      `;
      const cacheCheckResult = await pool.query(cacheCheckQuery);
      
      if (cacheCheckResult.rows.length > 0) {
        console.log('markets_cache table exists');
        
        // Check what's in it
        const cacheCountQuery = 'SELECT COUNT(*) as total FROM markets_cache';
        const cacheCountResult = await pool.query(cacheCountQuery);
        console.log(`Total records in markets_cache: ${cacheCountResult.rows[0].total}`);
        
        // Check which poly_ids are already deployed
        const deployedQuery = `
          SELECT poly_id 
          FROM markets_cache 
          WHERE poly_id IN (
            SELECT poly_id 
            FROM markets 
            WHERE market_id IS NOT NULL 
            AND status = 'live' 
            AND end_time > NOW()
          )
        `;
        const deployedResult = await pool.query(deployedQuery);
        console.log(`Markets already marked as deployed: ${deployedResult.rows.length}`);
        
        if (deployedResult.rows.length > 0) {
          console.log('Already deployed poly_ids:');
          deployedResult.rows.forEach(row => console.log(`  - ${row.poly_id}`));
        }
      } else {
        console.log('markets_cache table does NOT exist in this database');
        console.log('This means the pending-markets endpoint is checking a different database!');
      }
    } catch (err) {
      console.log('Error checking markets_cache:', err.message);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

// Run the check
checkPolymarketDB().catch(console.error); 