import pool from './database/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function updateMarketsTable() {
  try {
    // Read and execute the SQL file
    const sql = fs.readFileSync(path.join(__dirname, 'add_missing_columns.sql'), 'utf8');
    
    // Split by semicolons and execute each statement
    const statements = sql.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Executing:', statement.substring(0, 50) + '...');
        await pool.query(statement);
      }
    }
    
    console.log('Columns added successfully!');
    
    // Verify columns exist
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'markets'
      AND column_name IN ('min_bet', 'market_type', 'is_trending')
    `);
    
    console.log('New columns:', result.rows);
    
    process.exit(0);
  } catch (error) {
    console.error('Error updating table:', error);
    process.exit(1);
  }
}

updateMarketsTable(); 