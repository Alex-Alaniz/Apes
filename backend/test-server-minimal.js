// Minimal server test to identify startup issues
const dotenv = require('dotenv');
dotenv.config();

console.log('Testing minimal server startup...');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT || 5001);

try {
  // First test database connection
  console.log('\n1. Testing database connection...');
  const db = require('./database/db');
  
  // Test if we can make a simple query
  db.query('SELECT 1 as test')
    .then(result => {
      console.log('✅ Database connection successful:', result.rows[0]);
      
      // Now try to start the actual server
      console.log('\n2. Starting server.js...');
      require('./server.js');
    })
    .catch(dbError => {
      console.error('❌ Database connection failed:', dbError.message);
      process.exit(1);
    });
    
} catch (error) {
  console.error('❌ Server startup failed:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}