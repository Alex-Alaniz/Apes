const pool = require('../config/database');

async function checkTables() {
  try {
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('\nExisting tables in database:');
    result.rows.forEach(row => console.log(' -', row.table_name));
    
    // Check if the new tables exist
    const newTables = ['market_sources', 'scraped_markets', 'market_approvals'];
    const existing = result.rows.map(r => r.table_name);
    
    console.log('\nMobile Markets tables status:');
    newTables.forEach(table => {
      if (existing.includes(table)) {
        console.log(` ✅ ${table} exists`);
      } else {
        console.log(` ❌ ${table} missing`);
      }
    });
    
    pool.end();
  } catch (error) {
    console.error('Error:', error);
    pool.end();
  }
}

checkTables();