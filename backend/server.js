const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const pool = require('./config/database');
const userRoutes = require('./routes/users-supabase');
const leaderboardRoutes = require('./routes/leaderboard');
const predictionRoutes = require('./routes/predictions');
const marketRoutes = require('./routes/markets');
const adminRoutes = require('./routes/admin');
const engagementRoutes = require('./routes/engagement');
const twitterRoutes = require('./routes/twitter-supabase');
const setupRoutes = require('./routes/setup');
const syncService = require('./services/syncService');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

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
app.use('/api/setup', setupRoutes);

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
  console.log('💾 Supabase URL set:', !!process.env.POSTGRES_URL);
  console.log('💾 Neon URL set:', !!process.env.DATABASE_URL);
  console.log('🌐 CORS Origin:', process.env.CORS_ORIGIN);
  
  // Test main database connection (Supabase)
  try {
    await pool.testConnection();
    console.log('✅ Main database (Supabase) connection established successfully');
    
    // Start blockchain sync service
    syncService.startSync();
  } catch (error) {
    console.error('❌ Main database (Supabase) connection failed after retries:', error.message);
    console.error('🔧 Environment check:', {
      POSTGRES_URL: process.env.POSTGRES_URL ? 'Set (Supabase)' : 'Not set',
      DATABASE_URL: process.env.DATABASE_URL ? 'Set (Neon)' : 'Not set',
      POSTGRES_HOST: process.env.POSTGRES_HOST || 'Not set',
      POSTGRES_USER: process.env.POSTGRES_USER || 'Not set',
      POSTGRES_DATABASE: process.env.POSTGRES_DATABASE || 'Not set',
      NODE_ENV: process.env.NODE_ENV
    });
    console.log('⚠️ Server will continue without main database connection');
    // Don't exit - let server run for debugging
  }
  
  // Test secondary database connection (Neon - for Polymarket)
  if (process.env.DATABASE_URL) {
    try {
      const { testNeonConnection } = require('./config/neon-database');
      await testNeonConnection();
      console.log('✅ Secondary database (Neon) available for Polymarket data');
    } catch (error) {
      console.log('ℹ️ Secondary database (Neon) not available - Polymarket features may be limited');
    }
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  await pool.end();
  process.exit(0);
}); 