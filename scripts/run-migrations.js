const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigrations() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'prediction_market',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_HOST && process.env.DB_HOST.includes('supabase') 
      ? { rejectUnauthorized: false }
      : false
  });

  try {
    console.log('Running database migrations...');
    
    // Get all migration files
    const migrationsDir = path.join(__dirname, '../src/backend/migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    for (const file of migrationFiles) {
      console.log(`Running migration: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      
      try {
        await pool.query(sql);
        console.log(`✓ Migration ${file} completed successfully`);
      } catch (error) {
        console.error(`✗ Migration ${file} failed:`, error.message);
        // Continue with other migrations
      }
    }
    
    console.log('All migrations completed');
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    await pool.end();
  }
}

// Run migrations
runMigrations().catch(console.error); 