const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

// Create connection configuration
const isProduction = process.env.NODE_ENV === 'production';
const connectionConfig = {
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

if (isProduction && process.env.POSTGRES_URL_NON_POOLING) {
  // Production: Use non-pooling connection string, try without SSL first
  let connectionString = process.env.POSTGRES_URL_NON_POOLING;
  // Remove SSL requirement from connection string
  connectionString = connectionString.replace('?sslmode=require', '');
  connectionConfig.connectionString = connectionString;
  connectionConfig.ssl = false;
} else {
  // Development: Use individual parameters without SSL
  connectionConfig.host = process.env.POSTGRES_HOST || 'localhost';
  connectionConfig.port = parseInt(process.env.DB_PORT || '5432');
  connectionConfig.database = process.env.POSTGRES_DATABASE || 'postgres';
  connectionConfig.user = process.env.POSTGRES_USER;
  connectionConfig.password = process.env.POSTGRES_PASSWORD;
  connectionConfig.ssl = false;
}

const pool = new Pool(connectionConfig);

// Test database connection
pool.on('connect', () => {
  console.log('✅ Database connected successfully');
});

pool.on('error', (err) => {
  console.error('Unexpected database error', err);
  process.exit(-1);
});

module.exports = pool; 