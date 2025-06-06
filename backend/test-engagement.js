// Set environment variables BEFORE requiring modules
process.env.SUPABASE_URL = "https://xovbmbsnlcmxinlmlimz.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvdmJtYnNubGNteGlubG1saW16Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODY0NjUwNSwiZXhwIjoyMDY0MjIyNTA1fQ.J3_P7Y-u1OGD9gZlQ1FCHx5pPccPLhfttZOiu-_myOU";

const engagementService = require('./services/engagementService');

async function testEngagementSystem() {
  const testWallet = 'APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z';
  
  console.log('🧪 Testing Engagement System...');
  console.log('👤 Wallet:', testWallet);
  
  try {
    // Test 1: Award connection points
    console.log('\n📝 Test 1: Awarding connection points...');
    const connectionResult = await engagementService.trackActivity(testWallet, 'CONNECT_WALLET');
    console.log('✅ Connection points result:', connectionResult);
    
    // Test 2: Get balance after awarding points
    console.log('\n💰 Test 2: Getting balance...');
    const balance = await engagementService.getBalance(testWallet);
    console.log('✅ Balance result:', {
      total_points: balance.total_points,
      available_points: balance.available_points,
      tier: balance.tier,
      has_twitter_linked: balance.has_twitter_linked
    });
    
    // Test 3: Award daily login points (should fail without Twitter)
    console.log('\n🔄 Test 3: Testing Twitter requirement...');
    try {
      await engagementService.trackActivity(testWallet, 'DAILY_LOGIN');
      console.log('❌ Unexpected: Daily login succeeded without Twitter');
    } catch (err) {
      console.log('✅ Expected: Daily login correctly requires Twitter:', err.message);
    }
    
    console.log('\n🎉 All tests completed!');
    return true;
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

testEngagementSystem()
  .then((success) => {
    console.log(success ? '🏆 Engagement system working!' : '💥 Engagement system has issues');
    process.exit(success ? 0 : 1);
  })
  .catch((err) => {
    console.error('💥 Test error:', err);
    process.exit(1);
  }); 