#!/usr/bin/env node

// Universal start script that works from any directory
// This handles Railway deployment directory issues

const path = require('path');
const { spawn } = require('child_process');

// Determine the correct backend directory
const backendDir = path.join(__dirname, 'backend');
const serverFile = path.join(backendDir, 'server.js');

console.log('🚀 Starting APES Backend Server...');
console.log('📁 Backend directory:', backendDir);
console.log('📄 Server file:', serverFile);

// Check if server.js exists
const fs = require('fs');
if (!fs.existsSync(serverFile)) {
  console.error('❌ Error: server.js not found at:', serverFile);
  console.error('Available files in backend:', fs.readdirSync(backendDir));
  process.exit(1);
}

// Start the server from the backend directory
process.chdir(backendDir);
console.log('📂 Changed working directory to:', process.cwd());

// Spawn the server process
const server = spawn('node', ['server.js'], {
  stdio: 'inherit',
  cwd: backendDir
});

server.on('error', (err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});

server.on('close', (code) => {
  console.log(`🔴 Server process exited with code ${code}`);
  process.exit(code);
});

// Handle process termination
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  server.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...');
  server.kill('SIGINT');
}); 