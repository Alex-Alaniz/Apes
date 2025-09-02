// Quick test to see if server can start without errors
console.log('Testing server startup...');

try {
  // Test requiring all the new modules
  require('tweetnacl');
  console.log('✅ tweetnacl loaded');
  
  require('bs58');
  console.log('✅ bs58 loaded');
  
  // Test database connection
  const db = require('./database/db');
  console.log('✅ Database module loaded');
  
  // Test referral routes
  const referralRoutes = require('./routes/referrals');
  console.log('✅ Referral routes loaded');
  
  // Test middleware
  const referralAuth = require('./middleware/referralAuth');
  console.log('✅ Referral auth middleware loaded');
  
  // Test service
  const ReferralFeeService = require('./services/referralFeeService');
  console.log('✅ Referral fee service loaded');
  
  console.log('\n✅ All modules loaded successfully! Server should start.');
  process.exit(0);
  
} catch (error) {
  console.error('\n❌ Error loading modules:', error.message);
  console.error(error.stack);
  process.exit(1);
}