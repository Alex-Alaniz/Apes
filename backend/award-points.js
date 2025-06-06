// Set environment variables BEFORE requiring modules
process.env.SUPABASE_URL = "https://xovbmbsnlcmxinlmlimz.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvdmJtYnNubGNteGlubG1saW16Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODY0NjUwNSwiZXhwIjoyMDY0MjIyNTA1fQ.J3_P7Y-u1OGD9gZlQ1FCHx5pPccPLhfttZOiu-_myOU";

const engagementService = require('./services/engagementService');

async function awardPointsManually() {
  const testWallet = 'TEST123NEWUSER456';
  
  console.log('🎯 Manually awarding points to:', testWallet);
  
  try {
    // Award connection points manually
    const result = await engagementService.trackActivity(testWallet, 'CONNECT_WALLET');
    console.log('✅ Points awarded:', result);
    
    // Check balance
    const balance = await engagementService.getBalance(testWallet);
    console.log('💰 New balance:', {
      total_points: balance.total_points,
      available_points: balance.available_points,
      tier: balance.tier
    });
    
    console.log('🎉 Manual point awarding successful!');
    return true;
    
  } catch (error) {
    console.error('❌ Error awarding points:', error);
    return false;
  }
}

awardPointsManually()
  .then((success) => {
    console.log(success ? '🏆 Points system working!' : '💥 Points system failed');
    process.exit(success ? 0 : 1);
  })
  .catch((err) => {
    console.error('💥 Error:', err);
    process.exit(1);
  }); 