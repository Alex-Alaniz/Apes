// Railway-optimized server that starts minimal then loads full functionality
console.log('🚀 APES Railway Server starting...');
console.log('📊 Environment:', process.env.NODE_ENV);
console.log('🔌 PORT from env:', process.env.PORT);
console.log('📁 Working directory:', process.cwd());
console.log('📦 Node version:', process.version);

const express = require('express');
const app = express();
const PORT = process.env.PORT || 5001;

// CRITICAL: Health check MUST be first - before ANY imports or middleware
app.get('/health', (req, res) => {
  console.log('📊 Health check requested');
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    mode: 'railway-optimized'
  });
});

// Start server IMMEDIATELY for Railway health checks
console.log('🔄 Starting server on 0.0.0.0:' + PORT);
const server = app.listen(PORT, '0.0.0.0', async () => {
  console.log(`✅ Server listening on 0.0.0.0:${PORT}`);
  console.log('🟢 Health check ready at /health');
  
  // Now load the full application AFTER server is running
  setTimeout(async () => {
    try {
      console.log('📦 Loading full application...');
      
      // Load dependencies
      const cors = require('cors');
      const dotenv = require('dotenv');
      dotenv.config();
      
      // Load database (may fail if not configured)
      let pool, testConnection;
      try {
        const dbModule = require('./config/database');
        pool = dbModule.default || dbModule;
        testConnection = dbModule.testConnection;
        console.log('✅ Database module loaded');
      } catch (dbError) {
        console.log('⚠️ Database not configured:', dbError.message);
      }
      
      // Load security middleware
      let securityMiddleware;
      try {
        securityMiddleware = require('./middleware/security');
        console.log('✅ Security middleware loaded');
      } catch (secError) {
        console.log('⚠️ Security middleware error:', secError.message);
      }
      
      // Apply security middleware if loaded
      if (securityMiddleware) {
        const {
          generalLimiter,
          adminLimiter,
          securityHeaders,
          requestLogger,
          validateWalletAddress,
          sanitizeInputs,
          securityErrorHandler
        } = securityMiddleware;
        
        app.use(securityHeaders);
        app.use('/api/admin', adminLimiter);
        app.use(generalLimiter);
      }
      
      // CORS configuration
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
        exposedHeaders: ['RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset']
      };
      
      app.use(cors(corsOptions));
      app.use(express.json({ limit: '10mb' }));
      
      // Load routes
      const routeFiles = [
        'markets', 'predictions', 'users', 'leaderboard', 'tournaments',
        'admin', 'auth', 'rewards', 'payouts', 'engagement', 'twitter',
        'parlay', 'polymarket', 'dailyCrypto', 'orderbook'
      ];
      
      for (const routeFile of routeFiles) {
        try {
          const route = require(`./routes/${routeFile}`);
          app.use(`/api/${routeFile}`, route);
          console.log(`✅ Loaded route: /api/${routeFile}`);
        } catch (routeError) {
          console.log(`⚠️ Route ${routeFile} not available:`, routeError.message);
        }
      }
      
      // Basic root endpoint
      app.get('/', (req, res) => {
        res.json({
          message: 'APES Prediction Market API',
          status: 'running',
          version: '2.0',
          endpoints: {
            markets: '/api/markets',
            predictions: '/api/predictions',
            users: '/api/users',
            leaderboard: '/api/leaderboard',
            tournaments: '/api/tournaments'
          }
        });
      });
      
      // Error handling
      app.use((err, req, res, next) => {
        console.error('Error:', err.stack);
        res.status(500).json({ 
          error: 'Internal server error',
          message: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
      });
      
      console.log('✅ Full application loaded successfully');
      
      // Initialize services (optional)
      setTimeout(() => {
        console.log('🔄 Initializing optional services...');
        // Services will be loaded here if needed
      }, 5000);
      
    } catch (error) {
      console.error('❌ Error loading application:', error);
      console.error(error.stack);
      // Server continues running with health check
    }
  }, 1000); // 1 second delay to ensure health check is available
});

// Handle server errors
server.on('error', (err) => {
  console.error('❌ Server error:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('🔄 Shutting down gracefully...');
  server.close(() => process.exit(0));
});

process.on('SIGTERM', () => {
  console.log('🔄 Shutting down gracefully...');
  server.close(() => process.exit(0));
});

// Keep alive
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
  // Don't exit, keep server running
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled rejection:', reason);
  // Don't exit, keep server running
});