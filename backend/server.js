const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const pool = require('./config/database');
const { testConnection } = require('./config/database');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Enhanced CORS configuration
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:5173', 
    'https://apes-primape-app.vercel.app',
    'https://apes.primape.app',
    process.env.CORS_ORIGIN
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-wallet-address'],
};

app.use(cors(corsOptions));
app.use(express.json());

// Routes
const userRoutes = require('./routes/users');
const predictionRoutes = require('./routes/predictions');
const marketRoutes = require('./routes/markets');
const engagementRoutes = require('./routes/engagement');
const twitterRoutes = require('./routes/twitter');
const tournamentRoutes = require('./routes/tournaments');
const leaderboardRoutes = require('./routes/leaderboard');
const adminRoutes = require('./routes/admin');
const marketCreatorsRoutes = require('./routes/marketCreators');

app.use('/api/users', userRoutes);
app.use('/api/predictions', predictionRoutes);
app.use('/api/markets', marketRoutes);
app.use('/api/engagement', engagementRoutes);
app.use('/api/twitter', twitterRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/market-creators', marketCreatorsRoutes);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Test database connection
    const dbStart = Date.now();
    await pool.query('SELECT 1');
    const dbTime = Date.now() - dbStart;
    
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      database: {
        connected: true,
        responseTime: `${dbTime}ms`
      },
      services: {
        tweetCache: !!global.tweetCacheServiceStarted,
        syncService: !!global.syncServiceStarted
      },
      version: '1.0.0'
    };
    
    res.status(200).json(healthStatus);
  } catch (error) {
    console.error('❌ Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      environment: process.env.NODE_ENV || 'development'
    });
  }
});

// Basic route
app.get('/', (req, res) => {
  res.json({ 
    message: 'PRIMAPE Prediction Market API', 
    version: '1.0.0',
    docs: '/api/docs' 
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Initialize services and start server
async function startServer() {
  try {
    // Test database connection
    console.log('🔄 Testing database connection...');
    await testConnection();
    console.log('✅ Database connected successfully');

    // Initialize tweet cache service
    console.log('🔄 Initializing tweet cache service...');
    const tweetCacheService = require('./services/tweetCacheService');
    console.log('✅ Tweet cache service initialized');

    // Start blockchain sync service ONLY ONCE
    try {
      const syncService = require('./services/syncService');
      // Add a guard to prevent multiple sync instances
      if (!global.syncServiceStarted) {
        syncService.startSync();
        global.syncServiceStarted = true;
        console.log('✅ Blockchain sync service started');
      } else {
        console.log('⚠️ Sync service already running, skipping duplicate start');
      }
    } catch (syncError) {
      console.log('⚠️ Blockchain sync service not available:', syncError.message);
    }

    // Start market monitoring service for tournament markets
    try {
      const marketMonitoringService = require('./services/marketMonitoringService');
      if (!global.marketMonitoringStarted) {
        marketMonitoringService.start();
        global.marketMonitoringStarted = true;
        console.log('✅ Market monitoring service started (checking end times every minute)');
      } else {
        console.log('⚠️ Market monitoring service already running');
      }
    } catch (monitorError) {
      console.log('⚠️ Market monitoring service error:', monitorError.message);
    }

    // Start the server
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
      
      // Fix health check URL for Railway production
      const healthUrl = process.env.NODE_ENV === 'production' 
        ? `https://apes-production.up.railway.app/health`
        : `http://localhost:${PORT}/health`;
      
      console.log(`📊 Health check: ${healthUrl}`);
      console.log(`🐦 Tweet cache: Scheduled every 2 hours`);
      console.log(`💾 Cache status: https://apes-production.up.railway.app/api/twitter/cache-status`);
      console.log('📊 Environment:', process.env.NODE_ENV);
      console.log('💾 Supabase URL set:', !!process.env.POSTGRES_URL);
      console.log('🌐 CORS Origins:', corsOptions.origin);
    });

    // Set server timeout to prevent hanging
    server.timeout = 30000; // 30 seconds

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('🔄 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('🔄 Shutting down gracefully...');
  process.exit(0);
}); 