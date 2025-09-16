const express = require('express');
const path = require('path');

// Minimal server for Railway deployment
const app = express();
const PORT = process.env.PORT || 5001;

// Enhanced Railway environment logging
console.log('=== RAILWAY ENVIRONMENT DEBUG ===');
console.log('🔍 PORT from environment:', process.env.PORT);
console.log('🔍 Final PORT value:', PORT);
console.log('🚂 RAILWAY_ENVIRONMENT:', process.env.RAILWAY_ENVIRONMENT);
console.log('🆔 RAILWAY_SERVICE_ID:', process.env.RAILWAY_SERVICE_ID);
console.log('📦 RAILWAY_DEPLOYMENT_ID:', process.env.RAILWAY_DEPLOYMENT_ID);
console.log('🏠 HOME directory:', process.env.HOME);
console.log('📁 Current working directory:', process.cwd());
console.log('🖥️ Hostname:', require('os').hostname());
console.log('💻 Platform:', process.platform);
console.log('🔢 Node version:', process.version);
console.log('🕐 Server start time:', new Date().toISOString());
console.log('================================');

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
console.log('🔄 Attempting to start server...');
try {
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server listening on port ${PORT}`);
    console.log(`📊 Health endpoint: http://0.0.0.0:${PORT}/health`);
    console.log('🟢 Server is ready to accept connections');
  });

  // Handle errors
  server.on('error', (error) => {
    console.error('❌ Server error:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    process.exit(1);
  });

  // Add timeout handler
  server.setTimeout(30000);
  
  console.log('✅ Server initialization complete');
} catch (error) {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
}

// Keep process alive
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

console.log('✅ Minimal server script loaded');