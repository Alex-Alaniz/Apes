const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  // Use the provided Supabase database URL with SSL disabled to match backend configuration
  const DATABASE_URL = 'postgres://postgres.xovbmbsnlcmxinlmlimz:uKF5DzUcfwoRlryr@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=disable';

  const pool = new Pool({
    connectionString: DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000
  });

  try {
    console.log('🚀 Running tournament table migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, 'migrations', 'create_tournaments_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    await pool.query(migrationSQL);
    
    console.log('✅ Tournament table created successfully!');
    
    // Verify the table was created
    const checkResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'tournaments'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📊 Tournament table structure:');
    checkResult.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });
    
    // Check if default tournament was inserted
    const tournamentCheck = await pool.query(`
      SELECT tournament_id, name, status, assets
      FROM tournaments 
      WHERE tournament_id = 'club-world-cup-2025'
    `);
    
    if (tournamentCheck.rows.length > 0) {
      console.log('\n✅ Default FIFA Club World Cup 2025 tournament created!');
      console.log('Tournament details:', {
        id: tournamentCheck.rows[0].tournament_id,
        name: tournamentCheck.rows[0].name,
        status: tournamentCheck.rows[0].status,
        hasAssets: !!tournamentCheck.rows[0].assets
      });
    }
    
    // Also check tournament_participants table
    const participantsTableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'tournament_participants'
      )
    `);
    
    if (participantsTableCheck.rows[0].exists) {
      console.log('\n✅ Tournament participants table already exists');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the migration
runMigration(); 