const { Pool } = require('pg');
require('dotenv').config();

// Railway/Supabase optimized database configuration
// Railway provides POSTGRES_URL, but we also check for DATABASE_URL
const connectionString = process.env.DATABASE_URL || 
                        process.env.POSTGRES_URL || 
                        process.env.POSTGRES_PRISMA_URL ||
                        process.env.POSTGRES_URL_NON_POOLING;

const databaseConfig = connectionString
  ? {
      connectionString: connectionString,
      ssl: {
        rejectUnauthorized: false,
        require: true
      },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 15000, // Increased timeout
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
      ssl: {
        rejectUnauthorized: false,
        require: true
      }
    };

// Enhanced debug configuration
console.log('🔧 Database Configuration:', {
  usingConnectionString: !!connectionString,
  connectionString: connectionString ? 'Set' : 'Not set',
  host: databaseConfig.host || 'From connection string',
  database: databaseConfig.database || 'From connection string',
  user: databaseConfig.user || 'From connection string',
  ssl: !!databaseConfig.ssl,
  // Don't log sensitive info in production
  debug: process.env.NODE_ENV !== 'production' ? {
    DB_URL_exists: !!process.env.DATABASE_URL,
    PG_URL_exists: !!process.env.POSTGRES_URL,
    PG_HOST_exists: !!process.env.POSTGRES_HOST,
    PG_USER_exists: !!process.env.POSTGRES_USER,
    PG_PASS_exists: !!process.env.POSTGRES_PASSWORD
  } : 'Hidden in production'
});

const pool = new Pool(databaseConfig);

// Enhanced connection monitoring
pool.on('connect', (client) => {
  console.log('✅ Database pool: new client connected');
});

pool.on('error', (err, client) => {
  console.error('❌ Database pool error:', err.message);
  console.error('🔧 Error details:', {
    code: err.code,
    severity: err.severity,
    detail: err.detail
  });
});

// Add connection retry logic
const testConnection = async (retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const client = await pool.connect();
      const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
      client.release();
      console.log('✅ Database connection successful:', {
        time: result.rows[0].current_time,
        version: result.rows[0].pg_version.split(' ')[0]
      });
      return true;
    } catch (error) {
      console.error(`❌ Database connection attempt ${i + 1}/${retries} failed:`, error.message);
      if (i === retries - 1) {
        console.error('🚨 Final database connection failed. Check environment variables and network connectivity.');
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