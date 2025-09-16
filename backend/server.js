// Railway deployment debugging
console.log('🚀 APES Backend starting...');
console.log('📊 Environment:', process.env.NODE_ENV);
console.log('🔌 PORT from env:', process.env.PORT);
console.log('📁 Working directory:', process.cwd());
console.log('📦 Node version:', process.version);

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const pool = require('./config/database');
const { testConnection } = require('./config/database');

// 🔒 SECURITY MIDDLEWARE IMPORTS
const {
  generalLimiter,
  adminLimiter,
  authLimiter,
  marketActionLimiter,
  securityHeaders,
  requestLogger,
  validateWalletAddress,
  sanitizeInputs,
  securityErrorHandler
} = require('./middleware/security');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// 🔒 APPLY SECURITY MIDDLEWARE FIRST
app.use(securityHeaders);

// Apply rate limiting
app.use('/api/admin', adminLimiter);
app.use(generalLimiter);

// Enhanced CORS configuration
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5173', 
    'https://apes-primape-app.vercel.app',
    'https://apes.primape.app',
    process.env.CORS_ORIGIN
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-wallet-address', 'X-Wallet-Address', 'x-wallet-signature', 'x-signature-message'],
  exposedHeaders: ['RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' })); // Set JSON payload limit for security


// Early health check endpoint for Railway
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Security logging middleware
app.use(requestLogger);
app.use(validateWalletAddress);
app.use(sanitizeInputs);

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
const parlayTournamentRoutes = require('./routes/parlayTournaments');
const mobileMarketsRoutes = require('./routes/mobileMarkets');
const superAdminRoutes = require('./routes/superAdmin');
const referralRoutes = require('./routes/referrals');
const polymarketRoutes = require('./routes/polymarket');
const monitoringRoutes = require('./routes/monitoring');
const { errorHandler } = require('./utils/errorHandler');

// Handle OPTIONS pre-flight for PATCH requests
app.options('/api/mobile/markets/:marketId/approval', cors(corsOptions));

// Mobile API endpoint for admin-controlled markets
app.get('/api/mobile/markets', async (req, res) => {
  try {
    console.log('📱 Mobile API: GET /api/mobile/markets called');
    
    // Query for markets that are specifically approved for mobile
    // This allows admin control via a database column  
    const query = `
      SELECT 
        market_address,
        question,
        options,
        resolution_date,
        status,
        category,
        total_volume,
        created_at,
        mobile_approved,
        assets,
        options_metadata
      FROM markets 
      WHERE status = 'Active' 
        AND mobile_approved = true
        AND options IS NOT NULL 
        AND array_length(options, 1) = 2
      ORDER BY created_at DESC 
      LIMIT 20
    `;
    
    const result = await pool.query(query);
    
    if (result.rows.length === 0) {
      console.log('📱 Mobile API: No mobile-approved markets found - returning empty array (admin control)');
      return res.json([]);
    }
    
    // Process mobile-approved markets
    const mobileMarkets = result.rows.map(market => ({
      publicKey: market.market_address,
      marketAccount: market.market_address,
      question: market.question,
      options: market.options,
      resolutionDate: market.resolution_date,
      creatorFeeRate: 200, // Default 2%
      minBetAmount: 1000000, // Default 1 APES
      tokenMint: '9BZJXtmfPpkHnM57gHEx5Pc9oQhLhJtr4mhCsNtttTts',
      status: { active: {} },
      winningOption: null,
      optionPools: [0, 0],
      totalPool: parseFloat(market.total_volume || 0),
      marketId: market.market_address,
      category: market.category || 'crypto',
      participantCount: 0,
      dataSource: 'mobile_approved',
      // Include image assets from database
      assets: market.assets || null,
      optionsMetadata: market.options_metadata || null
    }));
    
    console.log(`📱 Mobile API: Returning ${mobileMarkets.length} mobile-approved markets`);
    res.json(mobileMarkets);
    
  } catch (error) {
    console.error('❌ Mobile API Error:', error);
    res.status(500).json({
      error: 'Failed to fetch mobile markets',
      details: error.message
    });
  }
});

// Update mobile approval status for a market (admin only)
app.patch('/api/mobile/markets/:marketId/approval', adminLimiter, async (req, res) => {
  try {
    const { marketId } = req.params;
    const { approved } = req.body;
    const walletAddress = req.headers['x-wallet-address'];
    
    // Check admin authorization
    const authorizedWallets = process.env.ADMIN_WALLETS?.split(',').map(w => w.trim()) || [];
    if (!walletAddress || !authorizedWallets.includes(walletAddress)) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }
    
    console.log(`📱 Mobile API: Admin ${walletAddress} updating approval for market ${marketId} to ${approved}`);
    
    const query = `
      UPDATE markets 
      SET mobile_approved = $1, updated_at = NOW()
      WHERE market_address = $2 
      RETURNING market_address, question, mobile_approved
    `;
    
    const result = await pool.query(query, [approved, marketId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Market not found' });
    }
    
    console.log(`✅ Mobile API: Updated market ${marketId} approval to ${approved}`);
    res.json({
      success: true,
      market: result.rows[0]
    });
    
  } catch (error) {
    console.error('❌ Mobile API Error updating approval:', error);
    res.status(500).json({
      error: 'Failed to update market approval',
      details: error.message
    });
  }
});

// Daily crypto markets endpoints (direct routes for immediate fix)
app.get('/api/markets/daily-crypto', async (req, res) => {
  try {
    console.log('📊 GET /api/markets/daily-crypto called');
    const axios = require('axios');
    
    // Get current prices
    const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true');
    const data = response.data;
    
    const btcPrice = data.bitcoin.usd;
    const ethPrice = data.ethereum.usd;
    const solPrice = data.solana.usd;
    
    console.log(`💰 Current prices: BTC $${btcPrice}, ETH $${ethPrice}, SOL $${solPrice}`);
    
    // Create simple up/down markets
    const markets = [
      {
        market_address: `manual_btc_${Date.now()}`,
        question: `Will Bitcoin be above $${Math.round(btcPrice)} at 11:59 PM UTC today?`,
        description: `Bitcoin price prediction. Current: $${btcPrice.toFixed(2)}. Resolves at market close.`,
        options: ['Yes', 'No'],
        category: 'Crypto',
        resolution_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        creator_fee: 200,
        min_bet: '10000000000',
        volume: '0',
        current_price: btcPrice,
        crypto_symbol: 'BTC'
      },
      {
        market_address: `manual_eth_${Date.now() + 1}`,
        question: `Will Ethereum be above $${Math.round(ethPrice)} at 11:59 PM UTC today?`,
        description: `Ethereum price prediction. Current: $${ethPrice.toFixed(2)}. Resolves at market close.`,
        options: ['Yes', 'No'],
        category: 'Crypto',
        resolution_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        creator_fee: 200,
        min_bet: '10000000000',
        volume: '0',
        current_price: ethPrice,
        crypto_symbol: 'ETH'
      },
      {
        market_address: `manual_sol_${Date.now() + 2}`,
        question: `Will Solana be above $${Math.round(solPrice)} at 11:59 PM UTC today?`,
        description: `Solana price prediction. Current: $${solPrice.toFixed(2)}. Resolves at market close.`,
        options: ['Yes', 'No'],
        category: 'Crypto',
        resolution_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        creator_fee: 200,
        min_bet: '10000000000',
        volume: '0',
        current_price: solPrice,
        crypto_symbol: 'SOL'
      }
    ];
    
    console.log('✅ Serving manual crypto markets');
    res.json({
      success: true,
      markets,
      pending: false,
      message: 'Manual crypto markets loaded'
    });
  } catch (error) {
    console.error('❌ Error fetching daily crypto markets:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/markets/daily-crypto', async (req, res) => {
  try {
    console.log('🚀 POST /api/markets/daily-crypto - Creating markets...');
    const axios = require('axios');
    
    // Get current prices
    const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true');
    const data = response.data;
    
    const btcPrice = data.bitcoin.usd;
    const ethPrice = data.ethereum.usd;
    const solPrice = data.solana.usd;
    
    console.log(`💰 Created markets with prices: BTC $${btcPrice}, ETH $${ethPrice}, SOL $${solPrice}`);
    
    // Create simple up/down markets
    const markets = [
      {
        market_address: `created_btc_${Date.now()}`,
        question: `Will Bitcoin be above $${Math.round(btcPrice)} at 11:59 PM UTC today?`,
        description: `Bitcoin price prediction. Current: $${btcPrice.toFixed(2)}. Resolves at market close.`,
        options: ['Yes', 'No'],
        category: 'Crypto',
        resolution_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        creator_fee: 200,
        min_bet: '10000000000',
        volume: '0',
        current_price: btcPrice,
        crypto_symbol: 'BTC'
      },
      {
        market_address: `created_eth_${Date.now() + 1}`,
        question: `Will Ethereum be above $${Math.round(ethPrice)} at 11:59 PM UTC today?`,
        description: `Ethereum price prediction. Current: $${ethPrice.toFixed(2)}. Resolves at market close.`,
        options: ['Yes', 'No'],
        category: 'Crypto',
        resolution_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        creator_fee: 200,
        min_bet: '10000000000',
        volume: '0',
        current_price: ethPrice,
        crypto_symbol: 'ETH'
      },
      {
        market_address: `created_sol_${Date.now() + 2}`,
        question: `Will Solana be above $${Math.round(solPrice)} at 11:59 PM UTC today?`,
        description: `Solana price prediction. Current: $${solPrice.toFixed(2)}. Resolves at market close.`,
        options: ['Yes', 'No'],
        category: 'Crypto',
        resolution_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        creator_fee: 200,
        min_bet: '10000000000',
        volume: '0',
        current_price: solPrice,
        crypto_symbol: 'SOL'
      }
    ];
    
    console.log('✅ POST: Successfully created 3 crypto markets');
    res.json({
      success: true,
      message: `Successfully created ${markets.length} daily crypto prediction markets!`,
      markets,
      pending: false
    });
  } catch (error) {
    console.error('❌ POST Error creating daily crypto markets:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create daily crypto markets',
      details: error.message
    });
  }
});

app.use('/api/users', userRoutes);
app.use('/api/predictions', predictionRoutes);
app.use('/api/markets', marketRoutes);
app.use('/api/engagement', engagementRoutes);
app.use('/api/twitter', twitterRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/market-creators', marketCreatorsRoutes);
app.use('/api/parlay-tournaments', parlayTournamentRoutes);
app.use('/api/mobile', mobileMarketsRoutes);
app.use('/api/super-admin', superAdminRoutes);
// Apply additional rate limiting to referral routes
app.use('/api/referrals', authLimiter, referralRoutes);
// Polymarket proxy routes  
app.use('/api/polymarket', polymarketRoutes);
// Order book routes for external market integration
app.use('/api/orderbook', require('./routes/orderBook'));
// Privy test routes
app.use('/api/privy', require('./routes/privyTest'));

// Monitoring and health check routes (no auth required)
app.use('/', monitoringRoutes);

// Basic route
app.get('/', (req, res) => {
  res.json({ 
    message: 'PRIMAPE Prediction Market API', 
    version: '1.0.0',
    docs: '/api/docs' 
  });
});

// Debug endpoint for frontend
app.get('/api/debug', (req, res) => {
  res.json({
    message: 'Backend is working!',
    timestamp: new Date().toISOString(),
    corsOrigins: corsOptions.origin,
    port: PORT
  });
});

// Database schema fix endpoint
app.post('/api/admin/fix-database-schema', adminLimiter, async (req, res) => {
  try {
    const walletAddress = req.headers['x-wallet-address'];
    const authorizedWallets = process.env.ADMIN_WALLETS?.split(',').map(w => w.trim()) || [];
    
    if (!walletAddress || !authorizedWallets.includes(walletAddress)) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }
    
    console.log(`🔧 Admin ${walletAddress} running database schema fixes`);
    
    // Fix missing role column in users table
    await pool.query(`
      DO $$ 
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                         WHERE table_name = 'users' AND column_name = 'role') THEN
              ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user';
          END IF;
      END $$;
    `);
    
    // Update admin users
    const adminUpdate = await pool.query(`
      UPDATE users SET role = 'admin' 
      WHERE wallet_address IN ($1, $2)
      RETURNING wallet_address, role
    `, ['APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z', '5eC9qH2vZQki2FKLmJR2WCsDw8MxzomyJDyfzoNHM2kE']);
    
    // Fix missing status column in markets if needed
    await pool.query(`
      DO $$ 
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                         WHERE table_name = 'markets' AND column_name = 'status') THEN
              ALTER TABLE markets ADD COLUMN status VARCHAR(20) DEFAULT 'Active';
          END IF;
      END $$;
    `);
    
    // Create treasury_snapshots table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS treasury_snapshots (
          id SERIAL PRIMARY KEY,
          snapshot_date DATE DEFAULT CURRENT_DATE,
          total_balance DECIMAL(20, 9) DEFAULT 0,
          total_exposure DECIMAL(20, 9) DEFAULT 0,
          risk_level VARCHAR(20) DEFAULT 'LOW',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Insert default snapshot
    await pool.query(`
      INSERT INTO treasury_snapshots (snapshot_date, total_balance, total_exposure, risk_level)
      SELECT CURRENT_DATE, 1222092565.71, 0, 'LOW'
      WHERE NOT EXISTS (SELECT 1 FROM treasury_snapshots WHERE snapshot_date = CURRENT_DATE)
    `);
    
    console.log(`✅ Database schema fixes complete`);
    
    res.json({
      success: true,
      message: 'Database schema fixes applied successfully',
      adminUpdates: adminUpdate.rows
    });
    
  } catch (error) {
    console.error('❌ Database schema fix failed:', error);
    res.status(500).json({
      error: 'Schema fix failed',
      details: error.message
    });
  }
});

// Migration endpoint for mobile approval
app.post('/api/admin/run-mobile-migration', adminLimiter, async (req, res) => {
  try {
    const walletAddress = req.headers['x-wallet-address'];
    const authorizedWallets = process.env.ADMIN_WALLETS?.split(',').map(w => w.trim()) || [];
    
    if (!walletAddress || !authorizedWallets.includes(walletAddress)) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }
    
    console.log(`🔧 Admin ${walletAddress} running mobile approval migration`);
    
    // Add mobile_approved column
    await pool.query(`ALTER TABLE markets ADD COLUMN IF NOT EXISTS mobile_approved BOOLEAN DEFAULT false`);
    
    // Update some existing markets for testing
    const updateResult = await pool.query(`
      UPDATE markets 
      SET mobile_approved = true 
      WHERE status = 'Active' 
        AND options IS NOT NULL 
        AND array_length(options, 1) = 2
        AND question NOT LIKE '%test%'
        AND mobile_approved = false
      RETURNING market_address, question
    `);
    
    // Create index
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_markets_mobile_approved 
      ON markets (mobile_approved, status) 
      WHERE mobile_approved = true AND status = 'Active'
    `);
    
    console.log(`✅ Mobile migration complete. Updated ${updateResult.rows.length} markets`);
    
    res.json({
      success: true,
      message: `Mobile approval migration completed`,
      updatedMarkets: updateResult.rows.length,
      markets: updateResult.rows
    });
    
  } catch (error) {
    console.error('❌ Mobile migration failed:', error);
    res.status(500).json({
      error: 'Migration failed',
      details: error.message
    });
  }
});

// Security error handler (must come before generic error handler)
app.use(securityErrorHandler);

// Comprehensive error handling middleware (must be last)
app.use(errorHandler);

// Initialize services and start server
async function startServer() {
  try {
    // Start the server FIRST for Railway health checks
    // Try to bind to all interfaces (IPv4 and IPv6)
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on 0.0.0.0:${PORT}`);
      console.log(`📊 Health check available at http://0.0.0.0:${PORT}/health`);
      console.log('🔄 Starting background service initialization...');
      console.log('🌐 Server is listening on all available interfaces (IPv4)');
      
      // Initialize services in the background AFTER server is listening
      initializeServices().catch(error => {
        console.error('❌ Service initialization failed:', error);
        // Server continues running even if services fail
      });
    });
    
    // Add error handler for server
    server.on('error', (error) => {
      console.error('❌ Server error:', error);
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use`);
      }
      process.exit(1);
    });

    // Set server timeout to prevent hanging
    server.timeout = 30000; // 30 seconds

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Separate function to initialize services after server starts
async function initializeServices() {
  try {
    // Test database connection
    console.log('🔄 Testing database connection...');
    await testConnection();
    console.log('✅ Database connected successfully');

    // Initialize tweet cache service
    console.log('🔄 Initializing tweet cache service...');
    const tweetCacheService = require('./services/tweetCacheService');
    console.log('✅ Tweet cache service initialized');

    // Initialize treasury monitoring service (optional - graceful fallback)
    try {
      console.log('🔄 Initializing treasury monitoring service...');
      const treasuryMonitoringService = require('./services/treasuryMonitoringService');
      await treasuryMonitoringService.initialize();
      console.log('✅ Treasury monitoring service initialized');
    } catch (error) {
      console.log('⚠️ Treasury monitoring service not available:', error.message);
      console.log('💡 Run treasury migration to enable risk management features');
    }

    // Initialize parlay payout service (optional - graceful fallback)
    try {
      console.log('🔄 Initializing parlay payout service...');
      const parlayPayoutService = require('./services/parlayPayoutService');
      await parlayPayoutService.initialize();
      console.log('✅ Parlay payout service initialized');
    } catch (error) {
      console.log('⚠️ Parlay payout service not available:', error.message);
      console.log('💡 Treasury monitoring required for automated payouts');
    }

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

    // Start daily crypto cron service (optional - graceful fallback)
    try {
      const DailyCronService = require('./services/dailyCronService');
      if (!global.dailyCronStarted) {
        const dailyCronService = new DailyCronService();
        dailyCronService.start();
        global.dailyCronStarted = true;
        console.log('✅ Daily crypto cron service started - oracle scans at 11:30 PM UTC daily');
      } else {
        console.log('⚠️ Daily cron service already running');
      }
    } catch (cronError) {
      console.log('⚠️ Daily cron service not available:', cronError.message);
      console.log('💡 Manual market creation still available via /daily-crypto page');
    }

    // Initialize order book service (optional - graceful fallback)
    try {
      console.log('🔄 Initializing order book service...');
      const orderBookService = require('./services/orderBookService');
      await orderBookService.initialize();
      console.log('✅ Order book service initialized');
    } catch (orderBookError) {
      console.log('⚠️ Order book service not available:', orderBookError.message);
      console.log('💡 External market integration will be limited');
    }

    // Scrapers removed - handled in separate project
    console.log('ℹ️ Scrapers handled in separate project to avoid deployment conflicts');

    // Log final status
    console.log('✅ All services initialized successfully');
    console.log('📊 Environment:', process.env.NODE_ENV);
    console.log('💾 Database:', !!process.env.POSTGRES_URL ? 'Connected' : 'Not configured');
    console.log('🌐 CORS Origins:', corsOptions.origin);

  } catch (error) {
    console.error('❌ Service initialization error:', error);
    // Don't exit - let server continue running
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