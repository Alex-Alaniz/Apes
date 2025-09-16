const express = require('express');
const path = require('path');

// Minimal server for Railway deployment
const app = express();
const PORT = process.env.PORT || 5001;

console.log('🚀 Starting APES minimal server...');
console.log('📊 Environment:', process.env.NODE_ENV);
console.log('🔌 Port:', PORT);

// Health check endpoint - MUST be first and simple
app.get('/health', (req, res) => {
  console.log('📊 Health check requested');
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Basic root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'APES API - Minimal Mode',
    status: 'running'
  });
});

// Start server immediately
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server listening on port ${PORT}`);
  console.log(`📊 Health endpoint: http://0.0.0.0:${PORT}/health`);
});

// Handle errors
server.on('error', (error) => {
  console.error('❌ Server error:', error);
  process.exit(1);
});

console.log('✅ Minimal server script loaded');