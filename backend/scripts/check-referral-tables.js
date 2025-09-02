const db = require('../config/database');

async function checkReferralTables() {
  console.log('🔍 Checking referral system database tables...\n');

  try {
    // Check if tables exist
    const tableCheckQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('referrals', 'referral_stats', 'referral_transactions')
      ORDER BY table_name;
    `;

    const tablesResult = await db.query(tableCheckQuery);
    console.log('📊 Existing referral tables:');
    tablesResult.rows.forEach(row => {
      console.log(`  ✅ ${row.table_name}`);
    });

    const existingTables = tablesResult.rows.map(r => r.table_name);
    const requiredTables = ['referrals', 'referral_stats', 'referral_transactions'];
    const missingTables = requiredTables.filter(t => !existingTables.includes(t));

    if (missingTables.length > 0) {
      console.log('\n❌ Missing tables:', missingTables.join(', '));
    }

    // Check columns for each existing table
    for (const tableName of existingTables) {
      console.log(`\n📋 Checking columns for ${tableName}:`);
      
      const columnQuery = `
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position;
      `;
      
      const columnsResult = await db.query(columnQuery, [tableName]);
      
      columnsResult.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
      });
    }

    // Check if users table has referral columns
    console.log('\n📋 Checking users table for referral columns:');
    const userColumnsQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'users' 
      AND column_name IN ('referral_code', 'referred_by', 'referral_source');
    `;
    
    const userColumnsResult = await db.query(userColumnsQuery);
    const existingUserColumns = userColumnsResult.rows.map(r => r.column_name);
    
    if (existingUserColumns.includes('referral_code')) {
      console.log('  ✅ referral_code column exists');
    } else {
      console.log('  ❌ referral_code column missing');
    }
    
    if (existingUserColumns.includes('referred_by')) {
      console.log('  ✅ referred_by column exists');
    } else {
      console.log('  ❌ referred_by column missing');
    }
    
    if (existingUserColumns.includes('referral_source')) {
      console.log('  ✅ referral_source column exists');
    } else {
      console.log('  ❌ referral_source column missing');
    }

    // Check indexes
    console.log('\n🔍 Checking indexes:');
    const indexQuery = `
      SELECT 
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
      AND tablename IN ('referrals', 'referral_stats', 'referral_transactions', 'users')
      AND indexname LIKE '%referr%'
      ORDER BY tablename, indexname;
    `;
    
    const indexResult = await db.query(indexQuery);
    if (indexResult.rows.length > 0) {
      indexResult.rows.forEach(idx => {
        console.log(`  - ${idx.tablename}.${idx.indexname}`);
      });
    } else {
      console.log('  ❌ No referral-related indexes found');
    }

    return { existingTables, missingTables };

  } catch (error) {
    console.error('❌ Error checking tables:', error.message);
    throw error;
  }
}

// Run the check
if (require.main === module) {
  checkReferralTables()
    .then(() => {
      console.log('\n✅ Database check complete');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Database check failed:', error);
      process.exit(1);
    });
}

module.exports = { checkReferralTables };