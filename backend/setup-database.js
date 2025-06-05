const pool = require('./database/db.js');
const fs = require('fs');

async function createTables() {
  try {
    console.log('📋 Creating database schema...');
    
    // Read and execute main schema
    const schema = fs.readFileSync('./database/schema.sql', 'utf8');
    await pool.query(schema);
    console.log('✅ Main schema created');
    
    // Read and execute markets table schema
    const marketsSchema = fs.readFileSync('./database/create_markets_table.sql', 'utf8');
    await pool.query(marketsSchema);
    console.log('✅ Markets table created');
    
    // Check tables exist
    const result = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';");
    console.log('📊 Created tables:', result.rows.map(r => r.table_name));
    
    await pool.end();
    console.log('🎉 Database setup complete!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
  }
}

createTables(); 