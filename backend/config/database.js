const { Pool } = require('pg');
require('dotenv').config();

// Use DATABASE_URL if available (Railway/Heroku style), otherwise use individual env vars
const databaseConfig = process.env.DATABASE_URL || process.env.POSTGRES_URL
  ? {
      connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    }
  : {
      host: process.env.POSTGRES_HOST || process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || process.env.DB_PORT || '5432'),
      database: process.env.POSTGRES_DATABASE || process.env.DB_NAME || 'prediction_market',
      user: process.env.POSTGRES_USER || process.env.DB_USER,
      password: process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      ssl: (process.env.POSTGRES_HOST || process.env.DB_HOST) && 
           (process.env.POSTGRES_HOST || process.env.DB_HOST) !== 'localhost'
        ? { rejectUnauthorized: false }
        : false
    };

const pool = new Pool(databaseConfig);

// Test database connection
pool.on('connect', () => {
  console.log('Database pool: new client connected');
});

pool.on('error', (err) => {
  console.error('Database pool error', err);
});

module.exports = pool; 