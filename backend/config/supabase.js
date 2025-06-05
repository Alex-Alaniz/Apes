const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase client configuration
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration:');
  console.error('SUPABASE_URL:', !!supabaseUrl);
  console.error('SUPABASE_KEY:', !!supabaseKey);
  throw new Error('Supabase configuration missing');
}

console.log('🔧 Supabase Configuration:', {
  url: supabaseUrl,
  keyType: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Service Role' : 'Anon Key',
  keySet: !!supabaseKey
});

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  },
  db: {
    schema: 'public'
  }
});

module.exports = supabase; 