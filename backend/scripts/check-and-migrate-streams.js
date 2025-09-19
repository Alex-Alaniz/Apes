/**
 * Check existing tables and run PumpFun stream migration
 */

const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

// Database configuration - match the app's SSL settings
const connectionString = "postgres://postgres.xovbmbsnlcmxinlmlimz:uKF5DzUcfwoRlryr@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=disable";

const pool = new Pool({
  connectionString: connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000
});

async function checkTables() {
  console.log('🔍 Checking existing database tables...\n');
  
  try {
    // Get all tables in public schema
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log('📊 Existing tables:');
    result.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });
    
    // Check if stream tables already exist
    const streamTables = result.rows.filter(row => 
      row.table_name.includes('stream') || 
      row.table_name.includes('pumpfun')
    );
    
    if (streamTables.length > 0) {
      console.log('\n⚠️  Found existing stream-related tables:');
      streamTables.forEach(table => {
        console.log(`   - ${table.table_name}`);
      });
    } else {
      console.log('\n✅ No existing stream tables found. Ready to migrate.');
    }
    
    return streamTables.length === 0;
    
  } catch (error) {
    console.error('❌ Error checking tables:', error.message);
    throw error;
  }
}

async function runMigration() {
  console.log('\n🚀 Running PumpFun stream tables migration...\n');
  
  try {
    // Read migration file
    const migrationPath = path.join(__dirname, '../migrations/add_pumpfun_stream_tables.sql');
    const migrationSQL = await fs.readFile(migrationPath, 'utf8');
    
    // Split by semicolons but handle CREATE INDEX statements properly
    const statements = migrationSQL
      .split(/;\s*(?=CREATE|INSERT|ALTER|DROP|--)/g)
      .filter(stmt => stmt.trim().length > 0)
      .map(stmt => stmt.trim() + (stmt.trim().endsWith(';') ? '' : ';'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip comments
      if (statement.trim().startsWith('--')) {
        continue;
      }
      
      // Extract table/index name for logging
      const createMatch = statement.match(/CREATE\s+(TABLE|INDEX)\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/i);
      const insertMatch = statement.match(/INSERT\s+INTO\s+(\w+)/i);
      
      if (createMatch) {
        console.log(`   Creating ${createMatch[1].toLowerCase()}: ${createMatch[2]}`);
      } else if (insertMatch) {
        console.log(`   Inserting test data into: ${insertMatch[1]}`);
      }
      
      try {
        await pool.query(statement);
        console.log(`   ✅ Success`);
      } catch (error) {
        if (error.code === '42P07') { // duplicate_table
          console.log(`   ⚠️  Already exists (skipping)`);
        } else if (error.code === '42701') { // duplicate_column
          console.log(`   ⚠️  Column already exists (skipping)`);
        } else {
          console.log(`   ❌ Error: ${error.message}`);
          throw error;
        }
      }
    }
    
    console.log('\n✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    throw error;
  }
}

async function verifyMigration() {
  console.log('\n🔍 Verifying migration...\n');
  
  try {
    // Check that all tables were created
    const tables = [
      'pumpfun_streams',
      'stream_markets',
      'stream_bets',
      'stream_payouts',
      'stream_stats'
    ];
    
    for (const table of tables) {
      const result = await pool.query(`
        SELECT COUNT(*) FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = $1
      `, [table]);
      
      if (result.rows[0].count === '1') {
        console.log(`   ✅ Table '${table}' exists`);
        
        // Get column count
        const columns = await pool.query(`
          SELECT COUNT(*) FROM information_schema.columns 
          WHERE table_schema = 'public' AND table_name = $1
        `, [table]);
        console.log(`      Columns: ${columns.rows[0].count}`);
      } else {
        console.log(`   ❌ Table '${table}' NOT FOUND`);
      }
    }
    
    // Check test data
    const testStreams = await pool.query('SELECT * FROM pumpfun_streams');
    console.log(`\n📊 Test streams inserted: ${testStreams.rows.length}`);
    
    if (testStreams.rows.length > 0) {
      console.log('   Sample stream:');
      const stream = testStreams.rows[0];
      console.log(`   - Token: ${stream.token_address.substring(0, 16)}...`);
      console.log(`   - Title: ${stream.title}`);
      console.log(`   - Featured: ${stream.is_featured}`);
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  }
}

async function main() {
  try {
    console.log('🏁 Starting PumpFun Stream Tables Setup\n');
    console.log('═'.repeat(50));
    
    // Check existing tables
    const shouldMigrate = await checkTables();
    
    console.log('\n' + '═'.repeat(50));
    
    if (shouldMigrate) {
      // Run migration
      await runMigration();
      
      console.log('\n' + '═'.repeat(50));
      
      // Verify migration
      await verifyMigration();
    } else {
      console.log('\n⚠️  Stream tables may already exist. Checking current state...');
      await verifyMigration();
    }
    
    console.log('\n' + '═'.repeat(50));
    console.log('\n🎉 Setup complete! Ready to build PumpFun livestream markets.');
    
  } catch (error) {
    console.error('\n💥 Setup failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the setup
main();