const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { Connection } = require('@solana/web3.js');
const { asyncHandler } = require('../utils/errorHandler');
const os = require('os');

// Cache for expensive checks
const cache = {
  solanaRPC: { status: null, lastCheck: 0 },
  polygonRPC: { status: null, lastCheck: 0 }
};
const CACHE_TTL = 30000; // 30 seconds

/**
 * GET /health
 * Basic health check endpoint
 */
router.get('/health', asyncHandler(async (req, res) => {
  const healthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
  };
  
  res.status(200).json(healthStatus);
}));

/**
 * GET /health/detailed
 * Detailed health check with all service statuses
 */
router.get('/health/detailed', asyncHandler(async (req, res) => {
  const checks = await Promise.allSettled([
    checkDatabase(),
    checkSolanaRPC(),
    checkPolygonRPC(),
    checkRedis(),
    checkDiskSpace()
  ]);
  
  const [database, solanaRPC, polygonRPC, redis, diskSpace] = checks;
  
  const allHealthy = checks.every(check => 
    check.status === 'fulfilled' && check.value.status === 'healthy'
  );
  
  const response = {
    status: allHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    services: {
      database: database.status === 'fulfilled' ? database.value : { status: 'error', message: database.reason?.message },
      solanaRPC: solanaRPC.status === 'fulfilled' ? solanaRPC.value : { status: 'error', message: solanaRPC.reason?.message },
      polygonRPC: polygonRPC.status === 'fulfilled' ? polygonRPC.value : { status: 'error', message: polygonRPC.reason?.message },
      redis: redis.status === 'fulfilled' ? redis.value : { status: 'error', message: redis.reason?.message },
      system: {
        diskSpace: diskSpace.status === 'fulfilled' ? diskSpace.value : { status: 'error' },
        memory: getMemoryUsage(),
        cpu: getCPUUsage()
      }
    }
  };
  
  res.status(allHealthy ? 200 : 503).json(response);
}));

/**
 * GET /metrics
 * Prometheus-compatible metrics endpoint
 */
router.get('/metrics', asyncHandler(async (req, res) => {
  const metrics = await collectMetrics();
  
  res.set('Content-Type', 'text/plain');
  res.send(metrics);
}));

/**
 * GET /stats
 * Application statistics
 */
router.get('/stats', asyncHandler(async (req, res) => {
  const stats = await getApplicationStats();
  
  res.json({
    timestamp: new Date().toISOString(),
    ...stats
  });
}));

// Health check functions
async function checkDatabase() {
  const start = Date.now();
  try {
    const result = await pool.query('SELECT 1 as health_check');
    const duration = Date.now() - start;
    
    return {
      status: 'healthy',
      responseTime: `${duration}ms`,
      connections: {
        active: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount
      }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
}

async function checkSolanaRPC() {
  // Use cache if recent
  if (cache.solanaRPC.lastCheck > Date.now() - CACHE_TTL) {
    return cache.solanaRPC.status;
  }
  
  const start = Date.now();
  try {
    const connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'
    );
    const slot = await connection.getSlot();
    const duration = Date.now() - start;
    
    const status = {
      status: 'healthy',
      responseTime: `${duration}ms`,
      currentSlot: slot
    };
    
    // Update cache
    cache.solanaRPC = { status, lastCheck: Date.now() };
    
    return status;
  } catch (error) {
    const status = {
      status: 'unhealthy',
      error: error.message
    };
    
    cache.solanaRPC = { status, lastCheck: Date.now() };
    return status;
  }
}

async function checkPolygonRPC() {
  // Use cache if recent
  if (cache.polygonRPC.lastCheck > Date.now() - CACHE_TTL) {
    return cache.polygonRPC.status;
  }
  
  if (!process.env.POLYGON_RPC_URL) {
    return { status: 'not_configured' };
  }
  
  const start = Date.now();
  try {
    const response = await fetch(process.env.POLYGON_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
        id: 1
      })
    });
    
    const data = await response.json();
    const duration = Date.now() - start;
    
    const status = {
      status: 'healthy',
      responseTime: `${duration}ms`,
      blockNumber: parseInt(data.result, 16)
    };
    
    cache.polygonRPC = { status, lastCheck: Date.now() };
    return status;
  } catch (error) {
    const status = {
      status: 'unhealthy',
      error: error.message
    };
    
    cache.polygonRPC = { status, lastCheck: Date.now() };
    return status;
  }
}

async function checkRedis() {
  // If Redis is not configured, it's optional
  if (!process.env.REDIS_URL) {
    return { status: 'not_configured' };
  }
  
  // TODO: Implement Redis health check
  return { status: 'not_implemented' };
}

async function checkDiskSpace() {
  try {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedPercent = ((totalMem - freeMem) / totalMem) * 100;
    
    return {
      status: usedPercent < 90 ? 'healthy' : 'warning',
      totalGB: (totalMem / 1024 / 1024 / 1024).toFixed(2),
      freeGB: (freeMem / 1024 / 1024 / 1024).toFixed(2),
      usedPercent: usedPercent.toFixed(2)
    };
  } catch (error) {
    return { status: 'error', message: error.message };
  }
}

function getMemoryUsage() {
  const usage = process.memoryUsage();
  return {
    heapUsedMB: (usage.heapUsed / 1024 / 1024).toFixed(2),
    heapTotalMB: (usage.heapTotal / 1024 / 1024).toFixed(2),
    rssMB: (usage.rss / 1024 / 1024).toFixed(2),
    externalMB: (usage.external / 1024 / 1024).toFixed(2)
  };
}

function getCPUUsage() {
  const cpus = os.cpus();
  const avgLoad = os.loadavg();
  
  return {
    cores: cpus.length,
    model: cpus[0]?.model,
    loadAverage: {
      '1min': avgLoad[0].toFixed(2),
      '5min': avgLoad[1].toFixed(2),
      '15min': avgLoad[2].toFixed(2)
    }
  };
}

async function collectMetrics() {
  // Prometheus format metrics
  const metrics = [];
  
  // Node.js metrics
  const memUsage = process.memoryUsage();
  metrics.push(`nodejs_heap_size_total_bytes ${memUsage.heapTotal}`);
  metrics.push(`nodejs_heap_size_used_bytes ${memUsage.heapUsed}`);
  metrics.push(`nodejs_external_memory_bytes ${memUsage.external}`);
  metrics.push(`nodejs_process_uptime_seconds ${process.uptime()}`);
  
  // Custom metrics
  try {
    // Database metrics
    const dbStats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM polymarket_orders) as total_orders,
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM markets) as total_markets
    `);
    
    const stats = dbStats.rows[0];
    metrics.push(`apes_total_orders ${stats.total_orders}`);
    metrics.push(`apes_total_users ${stats.total_users}`);
    metrics.push(`apes_total_markets ${stats.total_markets}`);
  } catch (error) {
    console.error('Error collecting database metrics:', error);
  }
  
  return metrics.join('\n');
}

async function getApplicationStats() {
  try {
    const [orderStats, userStats, marketStats, volumeStats] = await Promise.all([
      pool.query(`
        SELECT 
          COUNT(*) as total_orders,
          COUNT(CASE WHEN status = 'FILLED' THEN 1 END) as filled_orders,
          COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as orders_24h
        FROM polymarket_orders
      `),
      pool.query(`
        SELECT 
          COUNT(DISTINCT user_id) as total_users,
          COUNT(DISTINCT CASE WHEN verified_at > NOW() - INTERVAL '24 hours' THEN user_id END) as active_users_24h
        FROM user_fee_tiers
      `),
      pool.query(`
        SELECT 
          COUNT(*) as total_markets,
          COUNT(CASE WHEN status = 'Active' THEN 1 END) as active_markets
        FROM markets
      `),
      pool.query(`
        SELECT 
          COALESCE(SUM(size), 0) as total_volume,
          COALESCE(SUM(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN size END), 0) as volume_24h,
          COALESCE(SUM(platform_fee), 0) as total_fees_collected
        FROM polymarket_orders
        WHERE status = 'FILLED'
      `)
    ]);
    
    return {
      orders: {
        total: parseInt(orderStats.rows[0].total_orders),
        filled: parseInt(orderStats.rows[0].filled_orders),
        last24h: parseInt(orderStats.rows[0].orders_24h)
      },
      users: {
        total: parseInt(userStats.rows[0].total_users),
        active24h: parseInt(userStats.rows[0].active_users_24h)
      },
      markets: {
        total: parseInt(marketStats.rows[0].total_markets),
        active: parseInt(marketStats.rows[0].active_markets)
      },
      volume: {
        total: parseFloat(volumeStats.rows[0].total_volume),
        last24h: parseFloat(volumeStats.rows[0].volume_24h),
        totalFees: parseFloat(volumeStats.rows[0].total_fees_collected)
      }
    };
  } catch (error) {
    console.error('Error getting application stats:', error);
    return {
      error: 'Failed to collect statistics',
      message: error.message
    };
  }
}

module.exports = router;