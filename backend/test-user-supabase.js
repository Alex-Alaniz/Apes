// Set environment variables BEFORE requiring modules
process.env.SUPABASE_URL = "https://xovbmbsnlcmxinlmlimz.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvdmJtYnNubGNteGlubG1saW16Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODY0NjUwNSwiZXhwIjoyMDY0MjIyNTA1fQ.J3_P7Y-u1OGD9gZlQ1FCHx5pPccPLhfttZOiu-_myOU";

const express = require('express');
const userRoutes = require('./routes/users-supabase');

// Set up minimal express app for testing
const app = express();
app.use(express.json());
app.use('/api/users', userRoutes);

const server = app.listen(5002, () => {
  console.log('🧪 Test server running on port 5002');
});

// Test user creation
async function testUserCreation() {
  const testWallet = 'APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z';
  
  try {
    const response = await fetch('http://localhost:5002/api/users/create-or-get', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-wallet-address': testWallet
      }
    });
    
    const result = await response.json();
    console.log('📊 User creation result:', result);
    
    if (response.ok && result.wallet_address) {
      console.log('✅ User creation successful!');
      return true;
    } else {
      console.log('❌ User creation failed:', result);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
    return false;
  }
}

// Wait for server to start, then test
setTimeout(async () => {
  const success = await testUserCreation();
  console.log(success ? '🎉 Test passed!' : '💥 Test failed!');
  server.close();
  process.exit(success ? 0 : 1);
}, 1000); 