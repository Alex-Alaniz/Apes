/**
 * Update stream status for testing
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgres://postgres.xovbmbsnlcmxinlmlimz:uKF5DzUcfwoRlryr@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=disable"
});

async function updateStreamStatus() {
  try {
    // Set APES Dev Stream to live
    const result = await pool.query(`
      UPDATE pumpfun_streams 
      SET is_live = true, 
          viewer_count = 150,
          updated_at = NOW()
      WHERE token_address = '9BZJXtmfPpkHnM57gHEx5Pc9oQhLhJtr4mhCsNtttTts'
      RETURNING *
    `);

    if (result.rows.length > 0) {
      console.log('✅ Updated stream:', result.rows[0].title);
      console.log('   Live:', result.rows[0].is_live);
      console.log('   Viewers:', result.rows[0].viewer_count);
    }

    await pool.end();
  } catch (error) {
    console.error('Error:', error);
  }
}

updateStreamStatus();