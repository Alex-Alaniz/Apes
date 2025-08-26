// Completely isolated server for Railway debugging
const express = require('express');
const app = express();
const PORT = process.env.PORT || 5000;

console.log('🔥 ISOLATED DEBUG SERVER STARTING');
console.log('📍 PORT:', PORT);
console.log('📍 NODE_ENV:', process.env.NODE_ENV);
console.log('📍 Working directory:', process.cwd());

// Health endpoint - absolutely minimal
app.get('/health', (req, res) => {
  console.log('✅ Health check hit');
  res.status(200).send('ISOLATED_OK');
});

// Catch all other routes
app.use('*', (req, res) => {
  console.log('📥 Request to:', req.originalUrl);
  res.status(200).send(`Isolated server running. Path: ${req.originalUrl}`);
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 ISOLATED SERVER RUNNING on 0.0.0.0:${PORT}`);
  console.log(`🔗 Health: http://0.0.0.0:${PORT}/health`);
});

server.on('error', (error) => {
  console.error('🔥 Server error:', error);
});

console.log('⏰ Isolated server waiting for connections...');