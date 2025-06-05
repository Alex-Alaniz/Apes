const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'prediction_market',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  // SSL configuration for remote databases
  ssl: process.env.DB_HOST && process.env.DB_HOST !== 'localhost'
    ? { rejectUnauthorized: false }
    : false
});

// Test database connection
pool.on('connect', () => {
  console.log('Database pool: new client connected');
});

pool.on('error', (err) => {
  console.error('Database pool error', err);
});

module.exports = pool; 