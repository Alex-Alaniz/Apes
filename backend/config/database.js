const { Pool } = require('pg');
require('dotenv').config();

// Supabase-optimized database configuration
const databaseConfig = process.env.DATABASE_URL || process.env.POSTGRES_URL
  ? {
      connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
      ssl: {
        rejectUnauthorized: false,
        require: true
      },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000, // Longer timeout for Supabase
      query_timeout: 60000,
      statement_timeout: 60000
    }
  : {
      host: process.env.POSTGRES_HOST || process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || process.env.DB_PORT || '5432'),
      database: process.env.POSTGRES_DATABASE || process.env.DB_NAME || 'prediction_market',
      user: process.env.POSTGRES_USER || process.env.DB_USER,
      password: process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      ssl: {
        rejectUnauthorized: false,
        require: true
      }
    };

// Debug configuration
console.log('🔧 Database Configuration:', {
  usingConnectionString: !!(process.env.DATABASE_URL || process.env.POSTGRES_URL),
  connectionString: process.env.DATABASE_URL ? 'Set (DATABASE_URL)' : process.env.POSTGRES_URL ? 'Set (POSTGRES_URL)' : 'Not set',
  host: databaseConfig.host || 'From connection string',
  database: databaseConfig.database || 'From connection string',
  ssl: !!databaseConfig.ssl
});

const pool = new Pool(databaseConfig);

// Test database connection
pool.on('connect', () => {
  console.log('✅ Database pool: new client connected');
});

pool.on('error', (err) => {
  console.error('❌ Database pool error:', err.message);
});

module.exports = pool; 