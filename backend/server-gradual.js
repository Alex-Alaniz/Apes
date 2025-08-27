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

// Force queue opportunities (bypass existing market check)
app.post('/api/force-queue-opportunities', async (req, res) => {
  try {
    console.log('🚀 Force queuing opportunities...');
    
    const DailyCryptoOracle = require('./services/dailyCryptoOracle');
    const oracle = new DailyCryptoOracle();
    
    // Get market analysis
    const analysis = await oracle.analyzeMarketOpportunities();
    
    if (analysis.success && analysis.opportunities.length > 0) {
      // Force all opportunities to be recommended
      analysis.opportunities.forEach(opp => {
        opp.recommended = opp.score >= 3; // Override existing market check
      });
      
      console.log('🔍 Before queueing - Recommended opportunities:', analysis.opportunities.filter(o => o.recommended).length);
      
      const queueResult = await oracle.queueForApproval(analysis.opportunities);
      
      console.log('🔍 Queue result:', queueResult);
      
      res.json({
        status: 'success',
        message: `Force queued ${queueResult.queued_markets} opportunities`,
        analysis,
        queueResult,
        debug: {
          recommended_count: analysis.opportunities.filter(o => o.recommended).length,
          total_opportunities: analysis.opportunities.length
        }
      });
    } else {
      res.json({
        status: 'no_opportunities',
        message: 'No opportunities to queue',
        analysis
      });
    }
  } catch (error) {
    console.error('❌ Force queue failed:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Force queue failed',
      error: error.message
    });
  }
});

// Add migration endpoint for testing
app.post('/api/run-migration', async (req, res) => {
  try {
    console.log('🔧 Running pending_crypto_markets migration...');
    
    const pool = require('./config/database');
    
    // Create the table step by step
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS pending_crypto_markets (
        id SERIAL PRIMARY KEY,
        crypto_symbol VARCHAR(10) NOT NULL,
        crypto_name VARCHAR(50) NOT NULL,
        current_price DECIMAL(20, 8) NOT NULL,
        change_24h DECIMAL(10, 4),
        volume_24h DECIMAL(25, 2),
        opportunity_score INTEGER DEFAULT 0,
        price_ranges JSONB,
        market_question TEXT NOT NULL,
        market_description TEXT,
        reasons JSONB,
        status VARCHAR(20) DEFAULT 'pending',
        created_by VARCHAR(50) DEFAULT 'oracle_system',
        reviewed_by VARCHAR(100),
        review_notes TEXT,
        deployed_market_address VARCHAR(44),
        deployed_transaction_signature VARCHAR(88),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reviewed_at TIMESTAMP,
        deployed_at TIMESTAMP
      );
    `;
    
    // Execute the migration
    await pool.query(createTableSQL);
    
    res.json({
      status: 'success',
      message: 'Migration completed successfully'
    });
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Migration failed',
      error: error.message
    });
  }
});

// Test manual insert to pending_crypto_markets
app.post('/api/test-insert', async (req, res) => {
  try {
    const pool = require('./config/database');
    
    const testData = {
      crypto_symbol: 'BTC',
      crypto_name: 'Bitcoin',
      current_price: 111000.50,
      change_24h: 2.5,
      volume_24h: 40000000000,
      opportunity_score: 6,
      price_ranges: JSON.stringify([{label: 'Test range', description: 'Test'}]),
      market_question: 'Test question',
      market_description: 'Test description',
      reasons: JSON.stringify(['Test reason']),
      status: 'pending',
      created_by: 'test_system'
    };
    
    const query = `
      INSERT INTO pending_crypto_markets (
        crypto_symbol, crypto_name, current_price, change_24h, 
        volume_24h, opportunity_score, price_ranges, market_question,
        market_description, reasons, status, created_by, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP)
      RETURNING id, crypto_symbol
    `;
    
    const result = await pool.query(query, [
      testData.crypto_symbol,
      testData.crypto_name,
      testData.current_price,
      testData.change_24h,
      testData.volume_24h,
      testData.opportunity_score,
      testData.price_ranges,
      testData.market_question,
      testData.market_description,
      testData.reasons,
      testData.status,
      testData.created_by
    ]);
    
    res.json({
      status: 'success',
      message: 'Test insert successful',
      inserted_id: result.rows[0].id,
      inserted_symbol: result.rows[0].crypto_symbol
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Test insert failed',
      error: error.message,
      detail: error.detail
    });
  }
});

// Debug existing markets
app.get('/api/debug-markets', async (req, res) => {
  try {
    const pool = require('./config/database');
    
    // Check for existing crypto markets today
    const today = new Date().toISOString().split('T')[0];
    
    const marketsQuery = `
      SELECT question, category, created_at
      FROM markets 
      WHERE category = 'Crypto' 
      AND DATE(created_at) = $1
    `;
    
    const pendingQuery = `
      SELECT crypto_symbol, status, created_at
      FROM pending_crypto_markets 
      WHERE DATE(created_at) = $1
    `;
    
    const [marketsResult, pendingResult] = await Promise.all([
      pool.query(marketsQuery, [today]),
      pool.query(pendingQuery, [today]).catch(() => ({ rows: [] })) // Table might not exist
    ]);
    
    res.json({
      date: today,
      existing_markets: marketsResult.rows,
      pending_markets: pendingResult.rows,
      total_existing: marketsResult.rows.length,
      total_pending: pendingResult.rows.length
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

// Get daily crypto markets (pending or deployed)
app.get('/api/markets/daily-crypto', async (req, res) => {
  try {
    const pool = require('./config/database');
    
    // First check for deployed markets today
    const today = new Date().toISOString().split('T')[0];
    
    // Simple query first to check what exists
    const deployedQuery = `
      SELECT *
      FROM markets 
      WHERE category = 'Crypto' 
      AND DATE(created_at) = $1
      ORDER BY created_at DESC
    `;
    
    const deployedMarkets = await pool.query(deployedQuery, [today]);
    
    // If no deployed markets, check pending
    if (deployedMarkets.rows.length === 0) {
      const pendingQuery = `
        SELECT 
          id,
          crypto_symbol,
          crypto_name,
          current_price,
          change_24h,
          opportunity_score,
          price_ranges,
          market_question as question,
          market_description as description,
          status,
          created_at
        FROM pending_crypto_markets 
        WHERE DATE(created_at) = $1
        AND status = 'pending'
        ORDER BY crypto_symbol
      `;
      
      const pendingMarkets = await pool.query(pendingQuery, [today]);
      
      // Transform pending markets to match expected format
      const markets = pendingMarkets.rows.map(market => ({
        market_address: `pending_${market.id}`,
        question: market.question,
        description: market.description,
        options: market.price_ranges ? (typeof market.price_ranges === 'string' ? JSON.parse(market.price_ranges) : market.price_ranges).map(r => r.label) : [],
        category: 'Crypto',
        resolution_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        creator_fee: 200,
        min_bet: '10000000000', // 10 APES
        volume: '0',
        created_at: market.created_at,
        status: 'pending',
        current_price: market.current_price,
        change_24h: market.change_24h,
        crypto_symbol: market.crypto_symbol
      }));
      
      res.json({
        success: true,
        markets,
        pending: true,
        message: 'Markets are pending deployment'
      });
    } else {
      res.json({
        success: true,
        markets: deployedMarkets.rows,
        pending: false
      });
    }
  } catch (error) {
    console.error('❌ Error fetching daily crypto markets:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Create daily crypto markets (POST to same endpoint as GET)
app.post('/api/markets/daily-crypto', async (req, res) => {
  try {
    console.log('🚀 Creating daily crypto prediction markets...');
    
    // Use the force queue endpoint logic
    const DailyCryptoOracle = require('./services/dailyCryptoOracle');
    const oracle = new DailyCryptoOracle();
    
    // Get market analysis
    const analysis = await oracle.analyzeMarketOpportunities();
    
    if (analysis.success && analysis.opportunities.length > 0) {
      // Force all opportunities to be recommended
      analysis.opportunities.forEach(opp => {
        opp.recommended = opp.score >= 3;
      });
      
      const queueResult = await oracle.queueForApproval(analysis.opportunities);
      
      res.json({
        success: true,
        message: `Queued ${queueResult.queued_markets} crypto markets`,
        markets: queueResult.markets || [],
        pending: true
      });
    } else {
      res.json({
        success: false,
        error: 'No market opportunities found today'
      });
    }
  } catch (error) {
    console.error('Error creating daily crypto markets:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Deploy pending crypto markets on-chain
app.post('/api/markets/deploy-crypto', async (req, res) => {
  try {
    console.log('🚀 Deploying crypto markets on-chain...');
    
    const pool = require('./config/database');
    const DailyCryptoPredictions = require('./services/dailyCryptoPredictions');
    const cryptoService = new DailyCryptoPredictions();
    
    // Get pending markets
    const pendingQuery = `
      SELECT * FROM pending_crypto_markets 
      WHERE status = 'pending'
      ORDER BY crypto_symbol
    `;
    
    const pendingMarkets = await pool.query(pendingQuery);
    
    if (pendingMarkets.rows.length === 0) {
      return res.json({
        success: true,
        message: 'No pending markets to deploy'
      });
    }
    
    const deployed = [];
    
    for (const market of pendingMarkets.rows) {
      try {
        console.log(`📊 Deploying ${market.crypto_symbol} market...`);
        
        // Deploy on-chain
        const result = await cryptoService.createDailyMarket(
          { symbol: market.crypto_symbol, name: market.crypto_name },
          market.current_price
        );
        
        if (result.success) {
          // Update status in database
          await pool.query(
            `UPDATE pending_crypto_markets 
             SET status = 'deployed', 
                 deployed_market_address = $1,
                 deployed_transaction_signature = $2,
                 deployed_at = CURRENT_TIMESTAMP
             WHERE id = $3`,
            [result.marketPubkey, result.signature, market.id]
          );
          
          deployed.push({
            symbol: market.crypto_symbol,
            market_address: result.marketPubkey,
            signature: result.signature
          });
        }
      } catch (error) {
        console.error(`❌ Failed to deploy ${market.crypto_symbol}:`, error.message);
      }
    }
    
    res.json({
      success: true,
      deployed: deployed.length,
      markets: deployed,
      message: `Deployed ${deployed.length} markets on-chain`
    });
    
  } catch (error) {
    console.error('❌ Deployment error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Legacy routes for compatibility (frontend might be calling these)
app.get('/daily-crypto', (req, res) => {
  res.redirect('/api/markets/daily-crypto');
});

app.post('/daily-crypto', (req, res) => {
  res.redirect(307, '/api/markets/daily-crypto');
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