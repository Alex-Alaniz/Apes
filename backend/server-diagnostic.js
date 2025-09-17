// Diagnostic server to debug Railway deployment
console.log('🔍 DIAGNOSTIC SERVER STARTING');
console.log('🔍 Node version:', process.version);
console.log('🔍 Current directory:', process.cwd());
console.log('🔍 Environment:', process.env.NODE_ENV);
console.log('🔍 PORT:', process.env.PORT);

const express = require('express');
const app = express();
const PORT = process.env.PORT || 5001;

// Health check - absolutely first thing
app.get('/health', (req, res) => {
  console.log('✅ Health check received');
  res.status(200).json({ status: 'healthy', diagnostic: true });
});

// Test endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Diagnostic server running',
    port: PORT,
    env: process.env.NODE_ENV
  });
});

// Try to start server with comprehensive error handling
console.log('🔍 Attempting to bind to 0.0.0.0:' + PORT);

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('✅ Server successfully bound to 0.0.0.0:' + PORT);
  console.log('✅ Diagnostic server is running');
  console.log('✅ Health check available at http://0.0.0.0:' + PORT + '/health');
}).on('error', (err) => {
  console.error('❌ Server failed to start:', err);
  console.error('❌ Error code:', err.code);
  console.error('❌ Error message:', err.message);
  process.exit(1);
});

// Log any unhandled errors
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled rejection:', err);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught exception:', err);
  process.exit(1);
});

console.log('🔍 Server initialization complete, waiting for connections...');