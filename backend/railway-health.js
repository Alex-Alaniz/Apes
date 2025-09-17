// Ultra-minimal health check server for Railway
const http = require('http');

const PORT = process.env.PORT || 5000;

console.log('🚂 Railway Health Check Server Starting...');
console.log(`PORT: ${PORT}`);
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`RAILWAY_ENVIRONMENT: ${process.env.RAILWAY_ENVIRONMENT}`);

// Create the most basic HTTP server possible
const server = http.createServer((req, res) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'healthy',
      timestamp: new Date().toISOString(),
      port: PORT
    }));
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Railway Health Check Server Running');
  }
});

// Bind to all IPv4 interfaces
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Health check server listening on 0.0.0.0:${PORT}`);
  console.log(`Health endpoint: http://0.0.0.0:${PORT}/health`);
});

server.on('error', (error) => {
  console.error('❌ Server error:', error);
  process.exit(1);
});

// Keep the process alive
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  server.close(() => process.exit(0));
});