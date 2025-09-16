const express = require('express');
const app = express();
const PORT = process.env.PORT || 5000;

console.log('🚀 Railway server starting...');
console.log('PORT:', PORT);
console.log('Working directory:', process.cwd());
console.log('__dirname:', __dirname);

// Health check endpoint - MUST be first
app.get('/health', (req, res) => {
  console.log('Health check requested');
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'APES Backend - Railway Mode',
    status: 'running',
    port: PORT
  });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server listening on http://0.0.0.0:${PORT}`);
  console.log('Ready for health checks!');
});

// Error handling
server.on('error', (error) => {
  console.error('Server error:', error);
  process.exit(1);
});

// Keep alive
process.on('SIGTERM', () => {
  console.log('SIGTERM received');
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  console.log('SIGINT received');
  server.close(() => process.exit(0));
});