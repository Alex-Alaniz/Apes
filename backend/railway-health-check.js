// Ultra-minimal health check server for Railway deployment
const http = require('http');

const PORT = process.env.PORT || 5001;

console.log('🚂 Railway Health Check Server Starting...');
console.log(`🔌 PORT: ${PORT}`);
console.log(`📍 PID: ${process.pid}`);
console.log(`🕐 Started: ${new Date().toISOString()}`);

// Create the simplest possible HTTP server
const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', pid: process.pid }));
  } else {
    res.writeHead(404);
    res.end();
  }
});

// Listen on all interfaces
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Health check server listening on 0.0.0.0:${PORT}`);
});

server.on('error', (err) => {
  console.error('❌ Server error:', err);
  process.exit(1);
});

// Keep the process alive
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('💤 Server closed');
    process.exit(0);
  });
});