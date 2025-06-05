const supabase = require('./config/supabase');

async function testSupabaseConnection() {
  try {
    console.log('🧪 Testing Supabase connection...');
    
    // Test 1: Simple query
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Supabase query error:', error.message);
      return false;
    }
    
    console.log('✅ Supabase connection successful!');
    console.log('📊 Query result:', data);
    return true;
    
  } catch (err) {
    console.error('❌ Supabase connection failed:', err.message);
    return false;
  }
}

// Run the test
testSupabaseConnection()
  .then((success) => {
    console.log(success ? '🎉 All tests passed!' : '💥 Tests failed!');
    process.exit(success ? 0 : 1);
  })
  .catch((err) => {
    console.error('💥 Test error:', err);
    process.exit(1);
  }); 