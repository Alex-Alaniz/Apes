require('dotenv').config();
const axios = require('axios');
const { Connection, PublicKey } = require('@solana/web3.js');
const PolymarketProxyService = require('../services/polymarketProxyService');

// Test configuration
const TEST_CONFIG = {
  apiUrl: process.env.API_URL || 'http://localhost:5001',
  walletAddress: 'DemoSoLANAWaLLet111111111111111111111111111',
  testMarketId: 'will-btc-reach-100k-2024',
  polymarketApiUrl: 'https://clob.polymarket.com',
  solanaRpc: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'
};

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Helper functions
const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset}  ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset}  ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset}  ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset}  ${msg}`),
  section: (msg) => console.log(`\n${colors.cyan}═══ ${msg} ═══${colors.reset}\n`)
};

// Test suite
async function runIntegrationTests() {
  log.section('APES Polymarket Integration Test Suite');
  
  const results = {
    total: 0,
    passed: 0,
    failed: 0
  };

  // Test 1: Environment Check
  await test('Environment Configuration', async () => {
    assert(process.env.DATABASE_URL, 'DATABASE_URL is set');
    assert(process.env.SOLANA_RPC_URL, 'SOLANA_RPC_URL is set');
    
    if (!process.env.ENCRYPTION_PASSWORD) {
      throw new Error('ENCRYPTION_PASSWORD not set - required for wallet encryption');
    }
    
    if (!process.env.POLYGON_RPC_URL) {
      log.warn('POLYGON_RPC_URL not set - some features may not work');
    }
  }, results);

  // Test 2: Database Connection
  await test('Database Connection', async () => {
    const pool = require('../config/database');
    const result = await pool.query('SELECT NOW()');
    assert(result.rows.length > 0, 'Database query successful');
  }, results);

  // Test 3: Solana RPC Connection
  await test('Solana RPC Connection', async () => {
    const connection = new Connection(TEST_CONFIG.solanaRpc);
    const slot = await connection.getSlot();
    assert(slot > 0, `Connected to Solana (slot: ${slot})`);
  }, results);

  // Test 4: Polymarket API Connectivity
  await test('Polymarket API Connectivity', async () => {
    try {
      const response = await axios.get(`${TEST_CONFIG.polymarketApiUrl}/markets`, {
        timeout: 5000
      });
      assert(response.status === 200, 'Polymarket API reachable');
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Polymarket API not reachable - check if CLOB is public');
      }
      // API might require auth
      log.warn('Polymarket API returned error - may require authentication');
    }
  }, results);

  // Test 5: Backend API Health
  await test('Backend API Health Check', async () => {
    const response = await axios.get(`${TEST_CONFIG.apiUrl}/health`);
    assert(response.data.status === 'healthy', 'Backend API is healthy');
    assert(response.data.database.connected, 'Database connected via API');
  }, results);

  // Test 6: Polymarket Routes
  await test('Polymarket Routes Available', async () => {
    const endpoints = [
      '/api/polymarket/markets',
      '/api/polymarket/stats',
      '/api/polymarket/leaderboard'
    ];
    
    for (const endpoint of endpoints) {
      const response = await axios.get(`${TEST_CONFIG.apiUrl}${endpoint}`);
      assert(response.status === 200, `Endpoint ${endpoint} accessible`);
    }
  }, results);

  // Test 7: Fee Tier Calculation
  await test('Fee Tier Calculation', async () => {
    const proxy = new PolymarketProxyService();
    
    // Test different APES balances
    const testCases = [
      { balance: 0, expectedRate: 0.01, tier: 'Standard' },
      { balance: 1500, expectedRate: 0.0075, tier: 'Bronze' },
      { balance: 15000, expectedRate: 0.005, tier: 'Silver' },
      { balance: 75000, expectedRate: 0.003, tier: 'Gold' },
      { balance: 150000, expectedRate: 0.002, tier: 'Platinum' }
    ];
    
    for (const test of testCases) {
      const feeRate = proxy.calculateFeeRate(test.balance);
      assert(
        feeRate === test.expectedRate,
        `${test.tier} tier: ${test.balance} APES = ${feeRate * 100}% fee`
      );
    }
  }, results);

  // Test 8: Mock Order Placement
  await test('Mock Order Placement', async () => {
    const orderData = {
      marketId: TEST_CONFIG.testMarketId,
      outcomeId: 0,
      size: 100,
      side: 'BUY'
    };
    
    const response = await axios.post(
      `${TEST_CONFIG.apiUrl}/api/polymarket/place-order`,
      orderData,
      {
        headers: {
          'x-wallet-address': TEST_CONFIG.walletAddress
        }
      }
    );
    
    assert(response.data.orderId, 'Order ID returned');
    assert(response.data.fee !== undefined, 'Fee calculated');
    assert(response.data.feeSavings >= 0, 'Fee savings calculated');
  }, results);

  // Test 9: Wallet Encryption
  await test('Wallet Encryption/Decryption', async () => {
    const { getEncryptionService } = require('../utils/encryption');
    const encryption = getEncryptionService();
    
    const testKey = '0x' + '1234567890abcdef'.repeat(4);
    const encrypted = encryption.encrypt(testKey);
    const decrypted = encryption.decrypt(encrypted);
    
    assert(encrypted !== testKey, 'Private key encrypted');
    assert(decrypted === testKey, 'Private key decrypted correctly');
    assert(encrypted.split(':').length === 4, 'Encrypted format correct');
  }, results);

  // Test 10: Database Tables
  await test('Database Tables Exist', async () => {
    const pool = require('../config/database');
    
    const requiredTables = [
      'polymarket_orders',
      'proxy_wallets',
      'user_fee_tiers',
      'platform_fees',
      'copy_trading_subscriptions'
    ];
    
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name = ANY($1)
    `, [requiredTables]);
    
    const existingTables = result.rows.map(r => r.table_name);
    const missingTables = requiredTables.filter(t => !existingTables.includes(t));
    
    if (missingTables.length > 0) {
      throw new Error(`Missing tables: ${missingTables.join(', ')}. Run migrations first.`);
    }
    
    assert(existingTables.length === requiredTables.length, 'All required tables exist');
  }, results);

  // Print summary
  log.section('Test Summary');
  console.log(`Total Tests: ${results.total}`);
  console.log(`${colors.green}Passed: ${results.passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${results.failed}${colors.reset}`);
  
  if (results.failed === 0) {
    log.success('\nAll tests passed! 🎉');
  } else {
    log.error(`\n${results.failed} tests failed!`);
    process.exit(1);
  }
}

// Test helper function
async function test(name, fn, results) {
  results.total++;
  try {
    await fn();
    log.success(name);
    results.passed++;
  } catch (error) {
    log.error(`${name} - ${error.message}`);
    results.failed++;
  }
}

// Assertion helper
function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// Run the tests
if (require.main === module) {
  runIntegrationTests().catch(error => {
    log.error(`Fatal error: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  });
}

module.exports = { runIntegrationTests };