const { Pool } = require('pg');
require('dotenv').config();

// FOR APES PLATFORM - USE SUPABASE AS PRIMARY DATABASE
// Priority: POSTGRES_URL (Supabase) > DATABASE_URL (Neon/Polymarket)
// 
// Supabase: users, Twitter, leaderboard, engagement system
// Neon: Polymarket markets only (used elsewhere)

// FORCE SSL DISABLE for all Supabase connections to fix certificate issues
let connectionString = process.env.POSTGRES_URL || 
                      process.env.POSTGRES_PRISMA_URL ||
                      process.env.POSTGRES_URL_NON_POOLING ||
                      process.env.DATABASE_URL; // Fallback to Neon only if Supabase not available

// CRITICAL FIX: Force SSL disable for all connection strings to prevent cert errors
if (connectionString) {
  // Remove any existing SSL parameters and add sslmode=disable
  connectionString = connectionString.split('?')[0] + '?sslmode=disable';
  console.log('🔧 Forced SSL disable in connection string to prevent certificate errors');
}

// If no connection string but individual params exist, also force SSL disable
if (!connectionString && process.env.POSTGRES_HOST) {
  connectionString = `postgres://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@${process.env.POSTGRES_HOST}:${process.env.POSTGRES_PORT || 5432}/${process.env.POSTGRES_DATABASE}?sslmode=disable`;
  console.log('🔧 Created connection string from individual params with SSL disabled');
}

const databaseConfig = connectionString
  ? {
      connectionString: connectionString,
      // Only add SSL config if connection string doesn't disable SSL
      ...(connectionString.includes('sslmode=disable') ? {} : {
        ssl: {
          rejectUnauthorized: false
        }
      }),
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 15000,
      query_timeout: 60000,
      statement_timeout: 60000
    }
  : {
      host: process.env.POSTGRES_HOST || process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || process.env.DB_PORT || '5432'),
      database: process.env.POSTGRES_DATABASE || process.env.DB_NAME || 'prediction_market',
      user: process.env.POSTGRES_USER || process.env.DB_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 15000,
      ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
      } : false
    };

// Enhanced debug configuration for two-database setup
console.log('🔧 Database Configuration:', {
  primaryDatabase: connectionString === process.env.POSTGRES_URL ? 'Supabase' : 
                  connectionString === process.env.DATABASE_URL ? 'Neon' : 'Individual params',
  usingConnectionString: !!connectionString,
  connectionString: connectionString ? 'Set' : 'Not set',
  host: databaseConfig.host || 'From connection string',
  database: databaseConfig.database || 'From connection string',
  user: databaseConfig.user || 'From connection string',
  ssl: !!databaseConfig.ssl,
  sslMode: connectionString?.includes('sslmode=disable') ? 'disabled' : 
           connectionString?.includes('sslmode=require') ? 'required' : 'default',
  // Don't log sensitive info in production
  debug: process.env.NODE_ENV !== 'production' ? {
    POSTGRES_URL_exists: !!process.env.POSTGRES_URL,
    DATABASE_URL_exists: !!process.env.DATABASE_URL,
    POSTGRES_HOST_exists: !!process.env.POSTGRES_HOST,
    POSTGRES_USER_exists: !!process.env.POSTGRES_USER,
    POSTGRES_PASS_exists: !!process.env.POSTGRES_PASSWORD,
    selected_connection: connectionString?.substring(0, 50) + '...'
  } : 'Hidden in production'
});

// Verify we're using the correct database
if (connectionString === process.env.POSTGRES_URL) {
  console.log('✅ Using Supabase (POSTGRES_URL) - Correct for APES platform');
} else if (connectionString === process.env.DATABASE_URL) {
  console.log('⚠️ Using Neon (DATABASE_URL) - This should only be for Polymarket data');
  console.log('💡 Ensure POSTGRES_URL is set for main app functionality');
} else {
  console.log('ℹ️ Using individual connection parameters');
}

const pool = new Pool(databaseConfig);

// Enhanced connection monitoring
pool.on('connect', (client) => {
  console.log('✅ Database pool: new client connected to', 
    connectionString === process.env.POSTGRES_URL ? 'Supabase' : 
    connectionString === process.env.DATABASE_URL ? 'Neon' : 'Database'
  );
});

pool.on('error', (err, client) => {
  console.error('❌ Database pool error:', err.message);
  console.error('🔧 Error details:', {
    code: err.code,
    severity: err.severity,
    detail: err.detail,
    database: connectionString === process.env.POSTGRES_URL ? 'Supabase' : 
             connectionString === process.env.DATABASE_URL ? 'Neon' : 'Unknown'
  });
});

// Add connection retry logic with database identification
const testConnection = async (retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const client = await pool.connect();
      const result = await client.query('SELECT NOW() as current_time, current_database() as db_name');
      client.release();
      console.log('✅ Database connection successful:', {
        time: result.rows[0].current_time,
        database: result.rows[0].db_name,
        type: connectionString === process.env.POSTGRES_URL ? 'Supabase' : 
              connectionString === process.env.DATABASE_URL ? 'Neon' : 'Other'
      });
      return true;
    } catch (error) {
      console.error(`❌ Database connection attempt ${i + 1}/${retries} failed:`, error.message);
      if (i === retries - 1) {
        console.error('🚨 Final database connection failed.');
        console.error('💡 For APES platform, ensure POSTGRES_URL (Supabase) is properly configured');
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
    }
  }
  return false;
};

// Export both pool and test function
module.exports = pool;
module.exports.testConnection = testConnection; 