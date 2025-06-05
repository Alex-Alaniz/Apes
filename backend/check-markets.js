import pool from './database/db.js';

async function checkMarkets() {
  try {
    const countResult = await pool.query('SELECT COUNT(*) FROM markets');
    console.log('Total markets in database:', countResult.rows[0].count);
    
    const marketsResult = await pool.query('SELECT market_address, question, poly_id FROM markets LIMIT 5');
    console.log('Sample markets:', marketsResult.rows);
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
  }
}

checkMarkets(); 