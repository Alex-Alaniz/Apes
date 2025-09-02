const pool = require('../config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  console.log('🚀 Running Mobile Markets Pipeline migration...\n');
  
  try {
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '..', 'migrations', 'add_market_sources.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split by semicolons to run each statement separately
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📋 Found ${statements.length} SQL statements to execute\n`);
    
    let successCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      
      // Extract a description from the statement
      let description = statement.substring(0, 50).replace(/\n/g, ' ');
      if (statement.includes('ALTER TABLE')) {
        description = 'Adding column to markets table...';
      } else if (statement.includes('CREATE TABLE')) {
        const tableMatch = statement.match(/CREATE TABLE.*?(\w+)/);
        description = `Creating table: ${tableMatch ? tableMatch[1] : 'unknown'}`;
      } else if (statement.includes('CREATE INDEX')) {
        const indexMatch = statement.match(/CREATE INDEX.*?(\w+)/);
        description = `Creating index: ${indexMatch ? indexMatch[1] : 'unknown'}`;
      } else if (statement.includes('INSERT INTO')) {
        description = 'Inserting default data...';
      }
      
      console.log(`${i + 1}. ${description}`);
      
      try {
        await pool.query(statement);
        console.log('   ✅ Success\n');
        successCount++;
      } catch (error) {
        if (error.message.includes('already exists') || error.message.includes('duplicate')) {
          console.log('   ⚠️  Already exists (skipping)\n');
          successCount++;
        } else {
          console.log(`   ❌ Error: ${error.message}\n`);
        }
      }
    }
    
    console.log(`\n✨ Migration completed: ${successCount}/${statements.length} statements successful`);
    
    // Show current state
    console.log('\n📊 Checking migration results...\n');
    
    // Check if columns exist
    const columnsResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'markets' 
        AND column_name IN ('source', 'mobile_approved', 'time_category', 'quality_score')
    `);
    
    console.log(`✅ Added ${columnsResult.rows.length} new columns to markets table`);
    
    // Check if new tables exist
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name IN ('market_sources', 'scraped_markets', 'market_approvals')
        AND table_schema = 'public'
    `);
    
    console.log(`✅ Created ${tablesResult.rows.length} new tables`);
    
    // Check market sources
    const sourcesResult = await pool.query('SELECT name, type FROM market_sources ORDER BY name');
    
    if (sourcesResult.rows.length > 0) {
      console.log('\n📌 Configured market sources:');
      sourcesResult.rows.forEach(source => {
        console.log(`   - ${source.name} (${source.type})`);
      });
    }
    
    console.log('\n✅ Mobile Markets Pipeline database setup complete!');
    console.log('\n📝 Next steps:');
    console.log('1. Set ADMIN_WALLETS environment variable');
    console.log('2. Add API keys for Kalshi/Polymarket (optional)');
    console.log('3. Restart the backend server');
    console.log('4. Visit /admin/market-approval to start using the pipeline\n');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the migration
runMigration();