require('dotenv').config();

console.log('=== Twitter OAuth Configuration Test ===');

const requiredEnvVars = [
  'TWITTER_CLIENT_ID',
  'TWITTER_CLIENT_SECRET', 
  'TWITTER_CALLBACK_URL',
  'TWITTER_ENCRYPTION_KEY',
  'PRIMAPE_TWITTER_ID'
];

console.log('\n1. Environment Variables:');
requiredEnvVars.forEach(envVar => {
  const value = process.env[envVar];
  if (value) {
    console.log(`✓ ${envVar}: ${envVar.includes('SECRET') || envVar.includes('KEY') ? '[HIDDEN]' : value}`);
  } else {
    console.log(`✗ ${envVar}: MISSING`);
  }
});

console.log('\n2. Testing Twitter API Connection:');
const { TwitterApi } = require('twitter-api-v2');

const appClient = new TwitterApi({
  clientId: process.env.TWITTER_CLIENT_ID,
  clientSecret: process.env.TWITTER_CLIENT_SECRET,
});

// Test generating auth link
try {
  const { url, codeVerifier } = appClient.generateOAuth2AuthLink(
    process.env.TWITTER_CALLBACK_URL,
    {
      scope: ['tweet.read', 'users.read', 'follows.read', 'like.read', 'offline.access'],
      state: 'test-wallet-address',
    }
  );
  
  console.log('✓ Auth link generation successful');
  console.log(`  URL starts with: ${url.substring(0, 50)}...`);
  console.log(`  Code verifier length: ${codeVerifier.length}`);
  
} catch (error) {
  console.log('✗ Auth link generation failed:', error.message);
}

console.log('\n3. Database Connection:');
const db = require('./config/database');

db.query('SELECT COUNT(*) as count FROM wallet_twitter_links')
  .then(result => {
    console.log(`✓ Database connected - ${result.rows[0].count} existing wallet links`);
    process.exit(0);
  })
  .catch(error => {
    console.log('✗ Database connection failed:', error.message);
    process.exit(1);
  }); 