const db = require('../config/database');

async function testReferralSystem() {
  console.log('🧪 Testing referral system setup...\n');

  try {
    // Test 1: Check if we can query referrals table
    console.log('1️⃣ Testing referrals table query...');
    const referralsResult = await db.query('SELECT COUNT(*) FROM referrals');
    console.log(`   ✅ Referrals count: ${referralsResult.rows[0].count}`);

    // Test 2: Check if we can query referral_stats table
    console.log('\n2️⃣ Testing referral_stats table query...');
    const statsResult = await db.query('SELECT COUNT(*) FROM referral_stats');
    console.log(`   ✅ Referral stats count: ${statsResult.rows[0].count}`);

    // Test 3: Check if we can query referral_transactions table
    console.log('\n3️⃣ Testing referral_transactions table query...');
    const transactionsResult = await db.query('SELECT COUNT(*) FROM referral_transactions');
    console.log(`   ✅ Referral transactions count: ${transactionsResult.rows[0].count}`);

    // Test 4: Check users table referral columns
    console.log('\n4️⃣ Testing users table referral columns...');
    const usersResult = await db.query(`
      SELECT COUNT(*) as total,
             COUNT(referral_code) as with_code,
             COUNT(referred_by) as with_referrer
      FROM users
    `);
    console.log(`   ✅ Total users: ${usersResult.rows[0].total}`);
    console.log(`   ✅ Users with referral code: ${usersResult.rows[0].with_code}`);
    console.log(`   ✅ Users with referrer: ${usersResult.rows[0].with_referrer}`);

    // Test 5: Check if referral_code was populated for existing users
    console.log('\n5️⃣ Checking if existing users have referral codes...');
    const emptyCodesResult = await db.query(`
      SELECT COUNT(*) FROM users WHERE referral_code IS NULL
    `);
    const emptyCount = parseInt(emptyCodesResult.rows[0].count);
    
    if (emptyCount > 0) {
      console.log(`   ⚠️  ${emptyCount} users without referral codes. Updating...`);
      const updateResult = await db.query(`
        UPDATE users 
        SET referral_code = wallet_address 
        WHERE referral_code IS NULL 
        RETURNING wallet_address
      `);
      console.log(`   ✅ Updated ${updateResult.rowCount} users with their wallet address as referral code`);
    } else {
      console.log(`   ✅ All users have referral codes`);
    }

    // Test 6: Sample referral data structure
    console.log('\n6️⃣ Testing data structure with sample query...');
    const sampleUser = await db.query(`
      SELECT wallet_address, username, referral_code, referred_by, referral_source
      FROM users
      WHERE wallet_address IS NOT NULL
      LIMIT 1
    `);
    
    if (sampleUser.rows.length > 0) {
      console.log('   Sample user referral data:');
      console.log(`   - Wallet: ${sampleUser.rows[0].wallet_address}`);
      console.log(`   - Username: ${sampleUser.rows[0].username || 'not set'}`);
      console.log(`   - Referral Code: ${sampleUser.rows[0].referral_code || 'not set'}`);
      console.log(`   - Referred By: ${sampleUser.rows[0].referred_by || 'none'}`);
      console.log(`   - Source: ${sampleUser.rows[0].referral_source || 'none'}`);
    }

    console.log('\n✅ All tests passed! Referral system is ready.');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    throw error;
  }
}

// Run tests if called directly
if (require.main === module) {
  testReferralSystem()
    .then(() => {
      process.exit(0);
    })
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { testReferralSystem };