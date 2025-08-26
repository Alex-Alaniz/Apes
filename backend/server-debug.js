// Ultra minimal debug server
const express = require('express');
const app = express();
const PORT = process.env.PORT || 5001;

console.log('🔍 Debug server starting...');
console.log('📍 PORT:', PORT);
console.log('📍 NODE_ENV:', process.env.NODE_ENV);
console.log('📍 Working directory:', process.cwd());

// Most basic health check possible
app.get('/health', (req, res) => {
  console.log('✅ Health check requested');
  res.status(200).send('OK');
});

// Catch any route
app.get('*', (req, res) => {
  console.log('📥 Request to:', req.path);
  res.status(200).send(`Server running. Path: ${req.path}`);
});

// Error handling
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection:', reason);
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Debug server started on port ${PORT}`);
  console.log(`📍 Host: 0.0.0.0:${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});

server.on('error', (error) => {
  console.error('🔥 Server error:', error);
});

console.log('⏰ Waiting for connections...');