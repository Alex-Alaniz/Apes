// Gradually add features back to identify what breaks Railway
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

console.log('🔄 GRADUAL SERVER STARTING');
console.log('📍 PORT:', PORT);
console.log('📍 NODE_ENV:', process.env.NODE_ENV);

// Basic middleware
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173', 
    'https://apes-primape-app.vercel.app',
    'https://apes.primape.app',
    'https://apes-lake.vercel.app'
  ],
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check - keep simple
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Test database connection
app.get('/health/db', async (req, res) => {
  try {
    const pool = require('./config/database');
    await pool.query('SELECT 1');
    res.status(200).json({
      status: 'healthy',
      database: 'connected'
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      database: 'failed',
      error: error.message
    });
  }
});

// Add oracle test endpoint
app.get('/api/test-oracle', async (req, res) => {
  try {
    console.log('🔍 Testing oracle functionality...');
    
    // Test CoinGecko API
    const axios = require('axios');
    const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true');
    
    res.json({
      status: 'success',
      message: 'Oracle test passed',
      data: response.data
    });
  } catch (error) {
    console.error('❌ Oracle test failed:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Oracle test failed',
      error: error.message
    });
  }
});

// Add manual oracle trigger
app.post('/api/trigger-oracle', async (req, res) => {
  try {
    console.log('🎯 Manual oracle trigger requested');
    
    // Import oracle service
    const DailyCryptoOracle = require('./services/dailyCryptoOracle');
    const oracle = new DailyCryptoOracle();
    
    const opportunities = await oracle.runDailyOracle();
    
    res.json({
      status: 'success',
      message: `Oracle scan complete`,
      result: opportunities
    });
  } catch (error) {
    console.error('❌ Oracle trigger failed:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Oracle trigger failed',
      error: error.message
    });
  }
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 GRADUAL SERVER RUNNING on 0.0.0.0:${PORT}`);
  console.log(`🔗 Health: http://0.0.0.0:${PORT}/health`);
  console.log(`🗃️ DB Test: http://0.0.0.0:${PORT}/health/db`);
  console.log(`🎯 Oracle Test: http://0.0.0.0:${PORT}/api/test-oracle`);
});

server.on('error', (error) => {
  console.error('🔥 Server error:', error);
});

console.log('⏰ Gradual server ready for testing...');