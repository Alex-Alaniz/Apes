const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const pool = require('./database/db');
const userRoutes = require('./routes/users');
const leaderboardRoutes = require('./routes/leaderboard');
const predictionRoutes = require('./routes/predictions');
const marketRoutes = require('./routes/markets');
const adminRoutes = require('./routes/admin');
const engagementRoutes = require('./routes/engagement');
const twitterRoutes = require('./routes/twitter');
const syncService = require('./services/syncService');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/users', userRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/predictions', predictionRoutes);
app.use('/api/markets', marketRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/engagement', engagementRoutes);
app.use('/api/twitter', twitterRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log('📊 Environment:', process.env.NODE_ENV);
  console.log('💾 Database URL set:', !!process.env.POSTGRES_URL);
  console.log('🌐 CORS Origin:', process.env.CORS_ORIGIN);
  
  // Test database connection (non-blocking)
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Database connection test successful:', result.rows[0].now);
    
    // Start blockchain sync service
    syncService.startSync();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('🔧 Database details:', {
      host: process.env.POSTGRES_HOST || 'undefined',
      database: process.env.POSTGRES_DATABASE || 'undefined',
      user: process.env.POSTGRES_USER || 'undefined',
      port: process.env.DB_PORT || 'undefined'
    });
    console.log('⚠️ Server will continue without database connection');
    // Don't exit - let server run for debugging
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  await pool.end();
  process.exit(0);
}); 