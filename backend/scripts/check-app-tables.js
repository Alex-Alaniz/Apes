const pool = require('../config/database');

async function checkAppTables() {
  try {
    console.log('🔍 Investigating app creation issue...\n');
    
    // 1. Check for app-related tables
    const tablesResult = await pool.query(`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND (table_name LIKE '%app%' OR table_name LIKE '%dashboard%')
      ORDER BY table_name, ordinal_position
    `);
    
    console.log('📋 App/Dashboard related tables and columns:');
    let currentTable = '';
    tablesResult.rows.forEach(row => {
      if (row.table_name !== currentTable) {
        console.log(`\n  Table: ${row.table_name}`);
        currentTable = row.table_name;
      }
      console.log(`    - ${row.column_name} (${row.data_type})`);
    });
    
    if (tablesResult.rows.length === 0) {
      console.log('  ❌ No app/dashboard tables found!\n');
    }
    
    // 2. Check for general admin actions
    try {
      const adminActions = await pool.query(`
        SELECT action_type, admin_wallet, created_at, metadata
        FROM admin_actions 
        WHERE created_at > NOW() - INTERVAL '24 hours'
        ORDER BY created_at DESC 
        LIMIT 20
      `);
      
      console.log('\n🕐 Recent admin actions (last 24h):');
      if (adminActions.rows.length > 0) {
        adminActions.rows.forEach(action => {
          console.log(`  ${action.created_at.toISOString()}: ${action.action_type} by ${action.admin_wallet.slice(0,8)}...`);
        });
      } else {
        console.log('  No admin actions in last 24 hours');
      }
    } catch (error) {
      console.log('\n⚠️  Admin actions check failed:', error.message);
    }
    
    // 3. Look for any tables that might store apps
    console.log('\n🔍 Searching for possible app storage tables...');
    const allTablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    const possibleAppTables = allTablesResult.rows.filter(row => 
      row.table_name.includes('app') || 
      row.table_name.includes('dashboard') || 
      row.table_name.includes('project') ||
      row.table_name.includes('admin')
    );
    
    console.log('Possible app-related tables:');
    possibleAppTables.forEach(table => {
      console.log(`  - ${table.table_name}`);
    });
    
    // 4. Check if there are any apps stored in other tables
    for (const table of possibleAppTables) {
      try {
        const sampleData = await pool.query(`
          SELECT * FROM ${table.table_name} 
          ORDER BY id DESC 
          LIMIT 3
        `);
        
        if (sampleData.rows.length > 0) {
          console.log(`\n📊 Recent records in ${table.table_name}:`);
          console.log('  Columns:', Object.keys(sampleData.rows[0]));
          sampleData.rows.forEach((row, i) => {
            console.log(`  Record ${i + 1}:`, JSON.stringify(row, null, 2).substring(0, 200) + '...');
          });
        }
      } catch (error) {
        // Skip tables we can't read
      }
    }
    
    console.log('\n✅ Investigation complete\n');
    
  } catch (error) {
    console.error('❌ Error during investigation:', error);
  } finally {
    await pool.end();
  }
}

checkAppTables();