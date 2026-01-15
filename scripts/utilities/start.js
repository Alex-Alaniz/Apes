#!/usr/bin/env node

// Universal start script that works from any directory
// This handles Railway deployment directory issues

const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

console.log('🚀 STARTING APES BACKEND - DEBUG MODE');
console.log('📊 Environment:', process.env.NODE_ENV || 'undefined');
console.log('🌐 PORT:', process.env.PORT || 'undefined');
console.log('💾 Database URL set:', !!process.env.POSTGRES_URL);
console.log('📂 Current working directory:', process.cwd());
console.log('📋 Available files:', fs.readdirSync('.').slice(0, 10));

// Determine the correct backend directory
const backendDir = path.join(__dirname, 'backend');
const serverFile = path.join(backendDir, 'server.js');

console.log('🚀 Starting APES Backend Server...');
console.log('📁 Backend directory:', backendDir);
console.log('📄 Server file:', serverFile);

// Check if server.js exists
if (!fs.existsSync(serverFile)) {
  console.error('❌ Error: server.js not found at:', serverFile);
  console.error('Available files in backend:', fs.readdirSync(backendDir));
  process.exit(1);
}

// Start the server from the backend directory
process.chdir(backendDir);
console.log('📂 Changed working directory to:', process.cwd());

// Spawn the server process with better error handling
console.log('🔄 Spawning server process...');
const server = spawn('node', ['server.js'], {
  stdio: 'inherit',
  cwd: backendDir,
  env: { ...process.env } // Pass all environment variables
});

server.on('error', (err) => {
  console.error('❌ Failed to start server process:', err);
  console.error('📋 Error details:', {
    code: err.code,
    errno: err.errno,
    syscall: err.syscall,
    path: err.path,
    spawnargs: err.spawnargs
  });
  process.exit(1);
});

server.on('close', (code, signal) => {
  console.log(`🔴 Server process exited with code ${code}, signal: ${signal}`);
  if (code !== 0) {
    console.error('💥 Non-zero exit code indicates server crash');
  }
  process.exit(code);
});

// Add timeout to detect hanging processes
setTimeout(() => {
  console.log('⚠️ Server startup timeout - process may be hanging');
}, 30000);

// Handle process termination
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  server.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...');
  server.kill('SIGINT');
}); 