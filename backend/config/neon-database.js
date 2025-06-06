const { Pool } = require('pg');
require('dotenv').config();

// NEON DATABASE - FOR POLYMARKET DATA ONLY
// This is separate from the main Supabase database used for users, Twitter, etc.

const neonConfig = {
  connectionString: process.env.DATABASE_URL, // Neon database URL
  ssl: {
    rejectUnauthorized: false,
    require: true
  },
  max: 10, // Smaller pool for secondary database
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
};

console.log('🔧 Neon Database Configuration (Polymarket):', {
  configured: !!process.env.DATABASE_URL,
  host: process.env.PGHOST || 'Not set',
  database: process.env.PGDATABASE || 'Not set',
  user: process.env.PGUSER || 'Not set'
});

const neonPool = new Pool(neonConfig);

// Neon pool monitoring
neonPool.on('connect', () => {
  console.log('✅ Neon pool: connected for Polymarket data');
});

neonPool.on('error', (err) => {
  console.error('❌ Neon pool error:', err.message);
});

// Test Neon connection
const testNeonConnection = async () => {
  try {
    const client = await neonPool.connect();
    const result = await client.query('SELECT NOW() as current_time, current_database() as db_name');
    client.release();
    console.log('✅ Neon database connection successful:', {
      time: result.rows[0].current_time,
      database: result.rows[0].db_name,
      purpose: 'Polymarket data'
    });
    return true;
  } catch (error) {
    console.error('❌ Neon database connection failed:', error.message);
    return false;
  }
};

module.exports = {
  neonPool,
  testNeonConnection
}; 