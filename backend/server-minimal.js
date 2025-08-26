const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const pool = require('./config/database');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Basic middleware only
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

// Health check - super basic
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Health check with DB test
app.get('/health/db', async (req, res) => {
  try {
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

// Load routes
const marketsRoutes = require('./routes/markets');
const usersRoutes = require('./routes/users');
const predictionsRoutes = require('./routes/predictions');
const adminRoutes = require('./routes/admin');

app.use('/api/markets', marketsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/predictions', predictionsRoutes);
app.use('/api/admin', adminRoutes);

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Minimal server running on port ${PORT}`);
  console.log(`📊 Health: http://localhost:${PORT}/health`);
  console.log('✅ Railway deployment should pass health checks');
});