#!/usr/bin/env node

const { Pool } = require('pg');
require('dotenv').config();

// Use the same database configuration as the backend
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'prediction_market',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: process.env.DB_HOST && process.env.DB_HOST !== 'localhost'
    ? { rejectUnauthorized: false }
    : false
});

async function fixParticipantCounts() {
  try {
    console.log('🔧 Fixing participant counts for markets with volume...');
    
    // Set participant count to 1 for markets that have volume (indicating user participation)
    const updateQuery = `
      UPDATE markets 
      SET participant_count = 1 
      WHERE CAST(total_volume AS DECIMAL) > 0 
      AND status = 'Active'
    `;
    
    const result = await pool.query(updateQuery);
    console.log(`✅ Updated ${result.rowCount} markets to have participant_count = 1`);
    
    // Set participant count to 0 for markets with no volume
    const updateZeroQuery = `
      UPDATE markets 
      SET participant_count = 0 
      WHERE (total_volume IS NULL OR CAST(total_volume AS DECIMAL) = 0)
      AND status = 'Active'
    `;
    
    const zeroResult = await pool.query(updateZeroQuery);
    console.log(`✅ Updated ${zeroResult.rowCount} markets to have participant_count = 0`);
    
    // Verify the results
    const verifyQuery = `
      SELECT 
        market_address,
        question,
        total_volume,
        participant_count 
      FROM markets 
      WHERE status = 'Active' 
      ORDER BY CAST(total_volume AS DECIMAL) DESC
      LIMIT 5
    `;
    
    const verifyResult = await pool.query(verifyQuery);
    console.log('\n📊 Top 5 markets after update:');
    verifyResult.rows.forEach(row => {
      console.log(`  ${row.question.substring(0, 40)}... | Volume: ${row.total_volume} | Participants: ${row.participant_count}`);
    });
    
    console.log('\n🎉 Participant counts fixed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing participant counts:', error);
  } finally {
    await pool.end();
  }
}

fixParticipantCounts(); 