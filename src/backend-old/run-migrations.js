const fs = require('fs');
const path = require('path');
const db = require('./config/database');

async function runMigrations() {
  console.log('Running database migrations...');

  const migrationsDir = path.join(__dirname, 'migrations');
  
  try {
    // Create migrations tracking table if it doesn't exist
    await db.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename VARCHAR(255) PRIMARY KEY,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Get list of migration files
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      // Check if migration has been run
      const result = await db.query(
        'SELECT filename FROM schema_migrations WHERE filename = $1',
        [file]
      );

      if (result.rows.length === 0) {
        console.log(`Running migration: ${file}`);
        
        // Read and execute migration
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        
        // Split by semicolons and execute each statement
        const statements = sql.split(';').filter(s => s.trim());
        
        for (const statement of statements) {
          if (statement.trim()) {
            await db.query(statement);
          }
        }

        // Mark migration as executed
        await db.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1)',
          [file]
        );

        console.log(`✓ Migration ${file} completed`);
      } else {
        console.log(`- Migration ${file} already executed`);
      }
    }

    console.log('\nAll migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}

runMigrations(); 