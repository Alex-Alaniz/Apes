require('dotenv').config();

const requiredEnvVars = {
  // Database configuration
  DATABASE_URL: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  POSTGRES_HOST: process.env.POSTGRES_HOST,
  POSTGRES_USER: process.env.POSTGRES_USER,
  POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD,
  POSTGRES_DATABASE: process.env.POSTGRES_DATABASE,
  
  // Supabase configuration
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  
  // Server configuration
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  
  // Solana configuration
  SOLANA_NETWORK: process.env.SOLANA_NETWORK,
  SOLANA_RPC_URL: process.env.SOLANA_RPC_URL,
  APES_PROGRAM_ID: process.env.APES_PROGRAM_ID,
  APES_TOKEN_MINT: process.env.APES_TOKEN_MINT,
  APES_TREASURY: process.env.APES_TREASURY
};

const optionalEnvVars = {
  // Twitter OAuth (optional for basic functionality)
  TWITTER_CLIENT_ID: process.env.TWITTER_CLIENT_ID,
  TWITTER_CLIENT_SECRET: process.env.TWITTER_CLIENT_SECRET,
  TWITTER_CALLBACK_URL: process.env.TWITTER_CALLBACK_URL,
  
  // CORS
  CORS_ORIGIN: process.env.CORS_ORIGIN
};

function checkEnvironmentVariables() {
  console.log('🔍 Checking environment variables...\n');
  
  let missingRequired = [];
  let missingOptional = [];
  
  // Check required variables
  console.log('📋 Required Environment Variables:');
  for (const [key, value] of Object.entries(requiredEnvVars)) {
    const status = value ? '✅' : '❌';
    const displayValue = value ? (value.length > 50 ? `${value.substring(0, 47)}...` : value) : 'NOT SET';
    console.log(`   ${status} ${key}: ${key.includes('PASSWORD') || key.includes('KEY') ? '[HIDDEN]' : displayValue}`);
    
    if (!value) {
      missingRequired.push(key);
    }
  }
  
  console.log('\n📋 Optional Environment Variables:');
  for (const [key, value] of Object.entries(optionalEnvVars)) {
    const status = value ? '✅' : '⚠️';
    const displayValue = value ? (value.length > 50 ? `${value.substring(0, 47)}...` : value) : 'NOT SET';
    console.log(`   ${status} ${key}: ${key.includes('SECRET') || key.includes('KEY') ? '[HIDDEN]' : displayValue}`);
    
    if (!value) {
      missingOptional.push(key);
    }
  }
  
  // Database connection check
  console.log('\n🔧 Database Configuration Analysis:');
  const hasConnectionString = !!(process.env.DATABASE_URL || process.env.POSTGRES_URL);
  const hasIndividualParams = !!(process.env.POSTGRES_HOST && process.env.POSTGRES_USER && process.env.POSTGRES_PASSWORD);
  
  console.log(`   Connection String: ${hasConnectionString ? '✅ Available' : '❌ Missing'}`);
  console.log(`   Individual Params: ${hasIndividualParams ? '✅ Available' : '❌ Missing'}`);
  console.log(`   Supabase Config: ${process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Complete' : '❌ Incomplete'}`);
  
  // Summary
  console.log('\n📊 Summary:');
  console.log(`   Required variables: ${Object.keys(requiredEnvVars).length - missingRequired.length}/${Object.keys(requiredEnvVars).length} configured`);
  console.log(`   Optional variables: ${Object.keys(optionalEnvVars).length - missingOptional.length}/${Object.keys(optionalEnvVars).length} configured`);
  
  if (missingRequired.length > 0) {
    console.log('\n❌ Missing Required Variables:');
    missingRequired.forEach(key => console.log(`   - ${key}`));
    console.log('\n💡 Add these to your .env file or environment configuration.');
  }
  
  if (missingOptional.length > 0) {
    console.log('\n⚠️ Missing Optional Variables:');
    missingOptional.forEach(key => console.log(`   - ${key}`));
    console.log('\n💡 These are optional but may affect functionality (e.g., Twitter OAuth).');
  }
  
  // Database connectivity check
  if (hasConnectionString || hasIndividualParams) {
    console.log('\n🔍 Testing database connection...');
    testDatabaseConnection();
  } else {
    console.log('\n❌ Cannot test database connection - missing configuration');
  }
  
  return {
    allRequired: missingRequired.length === 0,
    missingRequired,
    missingOptional,
    databaseConfigured: hasConnectionString || hasIndividualParams
  };
}

async function testDatabaseConnection() {
  try {
    const pool = require('./config/database');
    await pool.testConnection();
    console.log('✅ Database connection successful');
  } catch (error) {
    console.log('❌ Database connection failed:', error.message);
    console.log('💡 Check your database configuration and network connectivity');
  }
}

// Railway-specific checks
function checkRailwayEnvironment() {
  console.log('\n🚂 Railway-Specific Checks:');
  
  const railwayVars = [
    'RAILWAY_ENVIRONMENT',
    'RAILWAY_PROJECT_ID',
    'RAILWAY_SERVICE_ID'
  ];
  
  const isRailway = railwayVars.some(key => process.env[key]);
  
  if (isRailway) {
    console.log('✅ Running on Railway');
    railwayVars.forEach(key => {
      const value = process.env[key];
      console.log(`   ${value ? '✅' : '⚠️'} ${key}: ${value || 'Not set'}`);
    });
  } else {
    console.log('ℹ️ Not running on Railway (or Railway variables not detected)');
  }
  
  return isRailway;
}

if (require.main === module) {
  console.log('🔧 Environment Configuration Check\n');
  const result = checkEnvironmentVariables();
  checkRailwayEnvironment();
  
  if (result.allRequired) {
    console.log('\n🎉 All required environment variables are configured!');
    process.exit(0);
  } else {
    console.log('\n💥 Some required environment variables are missing.');
    console.log('   Please configure them before starting the server.');
    process.exit(1);
  }
}

module.exports = { checkEnvironmentVariables, checkRailwayEnvironment }; 