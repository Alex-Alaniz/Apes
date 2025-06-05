const express = require('express');
const router = express.Router();
const pool = require('../database/db');
const fs = require('fs');
const path = require('path');

// POST /api/setup/database - Initialize database tables
router.post('/database', async (req, res) => {
  try {
    console.log('📋 Starting database setup...');
    
    // Read and execute main schema
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(schema);
    console.log('✅ Main schema created');
    
    // Read and execute markets table schema
    const marketsSchemaPath = path.join(__dirname, '../database/create_markets_table.sql');
    const marketsSchema = fs.readFileSync(marketsSchemaPath, 'utf8');
    await pool.query(marketsSchema);
    console.log('✅ Markets table created');
    
    // Check tables exist
    const result = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';");
    const tables = result.rows.map(r => r.table_name);
    console.log('📊 Created tables:', tables);
    
    res.json({ 
      success: true, 
      message: 'Database setup complete',
      tables: tables
    });
  } catch (error) {
    console.error('❌ Database setup error:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// POST /api/setup/clear-devnet - Clear devnet markets
router.post('/clear-devnet', async (req, res) => {
  try {
    console.log('🧹 Clearing devnet markets...');
    
    // Temporarily disable foreign key checks
    await pool.query('SET session_replication_role = replica');
    console.log('🔓 Disabled foreign key constraints');
    
    // Delete all markets (they're all devnet since no mainnet markets deployed yet)
    await pool.query('DELETE FROM markets');
    console.log('✅ Cleared markets table');
    
    // Delete related data
    await pool.query('DELETE FROM prediction_history');
    console.log('✅ Cleared prediction_history table');
    
    await pool.query('DELETE FROM markets_cache');
    console.log('✅ Cleared markets_cache table');
    
    await pool.query('DELETE FROM market_metadata');
    console.log('✅ Cleared market_metadata table');
    
    // Re-enable foreign key checks
    await pool.query('SET session_replication_role = DEFAULT');
    console.log('🔒 Re-enabled foreign key constraints');
    
    // Check counts
    const marketCount = await pool.query('SELECT COUNT(*) FROM markets');
    const historyCount = await pool.query('SELECT COUNT(*) FROM prediction_history');
    
    res.json({ 
      success: true, 
      message: 'Devnet markets cleared successfully',
      counts: {
        markets: parseInt(marketCount.rows[0].count),
        predictions: parseInt(historyCount.rows[0].count)
      }
    });
  } catch (error) {
    console.error('❌ Error clearing devnet data:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// GET /api/setup/status - Check database status
router.get('/status', async (req, res) => {
  try {
    const result = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';");
    const tables = result.rows.map(r => r.table_name);
    
    const requiredTables = ['users', 'markets', 'markets_cache', 'prediction_history'];
    const missingTables = requiredTables.filter(table => !tables.includes(table));
    
    res.json({
      tables: tables,
      requiredTables: requiredTables,
      missingTables: missingTables,
      isReady: missingTables.length === 0
    });
  } catch (error) {
    console.error('❌ Status check error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 