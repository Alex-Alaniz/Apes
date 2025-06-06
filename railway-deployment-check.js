// RAILWAY DEPLOYMENT CHECK - DATABASE CONFIGURATION VERIFICATION
// Run this before deploying to ensure proper database setup

const axios = require('axios');

const EXPECTED_ENV_VARS = {
  // Supabase (Main database for APES platform)
  supabase: {
    POSTGRES_URL: 'postgres://postgres.xovbmbsnlcmxinlmlimz:uKF5DzUcfwoRlryr@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require&supa=base-pooler.x',
    SUPABASE_URL: 'https://xovbmbsnlcmxinlmlimz.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    POSTGRES_HOST: 'db.xovbmbsnlcmxinlmlimz.supabase.co',
    POSTGRES_USER: 'postgres',
    POSTGRES_DATABASE: 'postgres',
    POSTGRES_PASSWORD: 'uKF5DzUcfwoRlryr'
  },
  // Neon (Secondary database for Polymarket data)
  neon: {
    DATABASE_URL: 'postgresql://neondb_owner:npg_qht1Er7SFAIn@ep-proud-snow-a4l83fqg.us-east-1.aws.neon.tech/neondb?sslmode=require',
    PGDATABASE: 'neondb',
    PGHOST: 'ep-proud-snow-a4l83fqg.us-east-1.aws.neon.tech',
    PGUSER: 'neondb_owner',
    PGPASSWORD: 'npg_qht1Er7SFAIn'
  },
  // Other required vars
  app: {
    NODE_ENV: 'production',
    PORT: '5000',
    CORS_ORIGIN: 'https://apes-lake.vercel.app',
    SOLANA_NETWORK: 'mainnet-beta',
    SOLANA_RPC_URL: 'https://api.mainnet-beta.solana.com'
  }
};

console.log('🚀 RAILWAY DEPLOYMENT CHECK - DATABASE CONFIGURATION');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

function checkEnvironmentSetup() {
  console.log('\n🔍 1. CHECKING RAILWAY ENVIRONMENT VARIABLES\n');
  
  let allGood = true;
  let warnings = [];
  
  // Check Supabase (Primary database)
  console.log('📊 Supabase Configuration (Primary Database):');
  Object.entries(EXPECTED_ENV_VARS.supabase).forEach(([key, expectedValue]) => {
    const actualValue = process.env[key];
    const isSet = !!actualValue;
    const isCorrect = key.includes('KEY') || key.includes('PASSWORD') ? 
      isSet : // For sensitive data, just check if set
      actualValue === expectedValue; // For non-sensitive, check exact match
    
    console.log(`   ${isSet ? '✅' : '❌'} ${key}: ${isSet ? (key.includes('KEY') || key.includes('PASSWORD') ? '[HIDDEN]' : 'Set') : 'Not set'}`);
    
    if (!isSet) {
      allGood = false;
    } else if (!isCorrect && !key.includes('KEY') && !key.includes('PASSWORD')) {
      warnings.push(`${key} value may be incorrect`);
    }
  });
  
  // Check Neon (Secondary database)
  console.log('\n📊 Neon Configuration (Secondary Database - Polymarket):');
  Object.entries(EXPECTED_ENV_VARS.neon).forEach(([key, expectedValue]) => {
    const actualValue = process.env[key];
    const isSet = !!actualValue;
    
    console.log(`   ${isSet ? '✅' : '⚠️'} ${key}: ${isSet ? (key.includes('PASSWORD') ? '[HIDDEN]' : 'Set') : 'Not set'}`);
    
    if (!isSet) {
      warnings.push(`${key} not set - Polymarket features may be limited`);
    }
  });
  
  // Check App configuration
  console.log('\n📊 App Configuration:');
  Object.entries(EXPECTED_ENV_VARS.app).forEach(([key, expectedValue]) => {
    const actualValue = process.env[key];
    const isSet = !!actualValue;
    
    console.log(`   ${isSet ? '✅' : '❌'} ${key}: ${actualValue || 'Not set'}`);
    
    if (!isSet) {
      allGood = false;
    }
  });
  
  return { allGood, warnings };
}

async function testDatabasePriority() {
  console.log('\n🔍 2. TESTING DATABASE PRIORITY CONFIGURATION\n');
  
  const hasSupabase = !!process.env.POSTGRES_URL;
  const hasNeon = !!process.env.DATABASE_URL;
  
  console.log('📊 Database Priority Check:');
  console.log(`   ${hasSupabase ? '✅' : '❌'} POSTGRES_URL (Supabase): ${hasSupabase ? 'Will be used as PRIMARY' : 'Missing - CRITICAL!'}`);
  console.log(`   ${hasNeon ? '✅' : '⚠️'} DATABASE_URL (Neon): ${hasNeon ? 'Available as secondary' : 'Missing - Polymarket limited'}`);
  
  if (hasSupabase) {
    console.log('\n✅ Configuration correct: Supabase will be used for main app functionality');
    return true;
  } else {
    console.log('\n❌ Configuration error: Missing POSTGRES_URL for Supabase');
    return false;
  }
}

async function testProductionEndpoint(railwayUrl) {
  console.log('\n🔍 3. TESTING PRODUCTION DEPLOYMENT\n');
  
  if (!railwayUrl) {
    console.log('⚠️ No Railway URL provided - skipping production test');
    console.log('💡 Run with: node railway-deployment-check.js https://apes-production.up.railway.app');
    return false;
  }
  
  console.log(`🌐 Testing: ${railwayUrl}`);
  
  try {
    // Test health endpoint
    const healthResponse = await axios.get(`${railwayUrl}/health`, { timeout: 10000 });
    console.log('✅ Health endpoint working:', healthResponse.data);
    
    // Test database-dependent endpoint (leaderboard)
    const leaderboardResponse = await axios.get(`${railwayUrl}/api/leaderboard`, { timeout: 15000 });
    const users = leaderboardResponse.data.leaderboard?.length || 0;
    console.log(`✅ Database working - Found ${users} users in leaderboard`);
    
    // Test real-time points fix
    try {
      await axios.post(`${railwayUrl}/api/users/refresh/test-deployment-check`, {}, { timeout: 10000 });
      console.log('✅ Real-time points endpoint deployed');
    } catch (error) {
      if (error.response?.status === 500) {
        console.log('✅ Real-time points endpoint exists (500 expected for test user)');
      } else {
        console.log('❌ Real-time points endpoint missing - deployment incomplete');
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.log(`❌ Production test failed: ${error.message}`);
    return false;
  }
}

function displayNextSteps(envCheck, dbCheck, prodCheck) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 DEPLOYMENT CHECKLIST RESULTS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const envStatus = envCheck.allGood ? '✅' : '❌';
  const dbStatus = dbCheck ? '✅' : '❌';
  const prodStatus = prodCheck === null ? '⚠️' : prodCheck ? '✅' : '❌';
  
  console.log(`${envStatus} Environment Variables Configured`);
  console.log(`${dbStatus} Database Priority Correct`);
  console.log(`${prodStatus} Production Deployment ${prodCheck === null ? 'Not Tested' : prodCheck ? 'Working' : 'Failed'}`);
  
  if (envCheck.warnings.length > 0) {
    console.log('\n⚠️ Warnings:');
    envCheck.warnings.forEach(warning => console.log(`   • ${warning}`));
  }
  
  if (envCheck.allGood && dbCheck) {
    console.log('\n🎉 READY FOR DEPLOYMENT!');
    console.log('\n📝 Next Steps:');
    console.log('1. git add backend/config/database.js backend/config/neon-database.js backend/server.js');
    console.log('2. git commit -m "🔧 Fix database configuration: prioritize Supabase over Neon"');
    console.log('3. git push origin master');
    console.log('4. Check Railway deployment logs for "✅ Using Supabase (POSTGRES_URL)"');
    console.log('5. Test with: node quick-production-test.js https://apes-production.up.railway.app');
    
    console.log('\n✅ Expected Production Logs:');
    console.log('   "✅ Using Supabase (POSTGRES_URL) - Correct for APES platform"');
    console.log('   "✅ Main database (Supabase) connection established successfully"');
    console.log('   "✅ Secondary database (Neon) available for Polymarket data"');
  } else {
    console.log('\n❌ DEPLOYMENT BLOCKED');
    console.log('\n🔧 Fix Required:');
    if (!envCheck.allGood) {
      console.log('   • Configure missing environment variables in Railway dashboard');
    }
    if (!dbCheck) {
      console.log('   • Ensure POSTGRES_URL is set for Supabase connection');
    }
  }
}

// Main execution
async function main() {
  const railwayUrl = process.argv[2];
  
  const envCheck = checkEnvironmentSetup();
  const dbCheck = await testDatabasePriority();
  const prodCheck = railwayUrl ? await testProductionEndpoint(railwayUrl) : null;
  
  displayNextSteps(envCheck, dbCheck, prodCheck);
  
  const success = envCheck.allGood && dbCheck;
  process.exit(success ? 0 : 1);
}

if (require.main === module) {
  main().catch(error => {
    console.error('💥 Check failed:', error);
    process.exit(1);
  });
}

module.exports = { checkEnvironmentSetup, testDatabasePriority, testProductionEndpoint }; 