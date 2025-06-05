import pool from './database/db.js';

async function cleanup() {
  try {
    await pool.query("DELETE FROM markets WHERE poly_id = 'test-poly'");
    console.log('Test market removed');
    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
  }
}

cleanup(); 