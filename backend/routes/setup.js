const express = require('express');
const router = express.Router();
const pool = require('../config/database');
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
    
    // Check for foreign key constraints
    const fkResult = await pool.query(`
      SELECT tc.constraint_name, tc.table_name, kcu.column_name, 
             ccu.table_name AS foreign_table_name,
             ccu.column_name AS foreign_column_name 
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' 
      AND tc.table_name IN ('markets', 'predictions', 'prediction_history')
    `);
    
    console.log('🔍 Foreign key constraints:', fkResult.rows);
    
    // Try to delete all dependent data first
    const tablesToClear = [
      'predictions', 
      'user_predictions', 
      'market_predictions', 
      'prediction_history',
      'markets_cache',
      'market_metadata'
    ];
    
    for (const table of tablesToClear) {
      try {
        await pool.query(`DELETE FROM ${table}`);
        console.log(`✅ Cleared ${table} table`);
      } catch (e) {
        console.log(`⚠️ Table ${table} not found or already empty:`, e.message);
      }
    }
    
    // Now try to delete markets
    await pool.query('DELETE FROM markets');
    console.log('✅ Cleared markets table');
    
    // Check final counts
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