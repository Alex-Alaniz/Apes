console.log('🔍 Diagnosing server startup issues...\n');

// Check environment
console.log('Environment Variables:');
console.log('NODE_ENV:', process.env.NODE_ENV || 'not set');
console.log('PORT:', process.env.PORT || 'not set');
console.log('DATABASE_URL set:', !!process.env.DATABASE_URL);
console.log('POSTGRES_URL set:', !!process.env.POSTGRES_URL);
console.log('SUPABASE_URL set:', !!process.env.SUPABASE_URL);

// Test each import separately
const tests = [
  { name: 'express', module: 'express' },
  { name: 'tweetnacl', module: 'tweetnacl' },
  { name: 'bs58', module: 'bs58' },
  { name: 'database', module: './database/db' },
  { name: 'referralAuth', module: './middleware/referralAuth' },
  { name: 'referralRoutes', module: './routes/referrals' },
  { name: 'referralFeeService', module: './services/referralFeeService' }
];

console.log('\nTesting module imports:');
for (const test of tests) {
  try {
    require(test.module);
    console.log(`✅ ${test.name} loaded successfully`);
  } catch (error) {
    console.log(`❌ ${test.name} failed:`, error.message);
  }
}

console.log('\nDiagnosis complete.');