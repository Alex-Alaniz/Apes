// Railway deployment debugging script
// This script tests various aspects of the Railway environment

const http = require('http');
const https = require('https');
const dns = require('dns').promises;
const os = require('os');
const fs = require('fs');
const path = require('path');

console.log('=== RAILWAY DEPLOYMENT DEBUG SCRIPT ===');
console.log('Time:', new Date().toISOString());
console.log('');

// 1. Environment Variables
console.log('1. ENVIRONMENT VARIABLES:');
console.log('   PORT:', process.env.PORT);
console.log('   NODE_ENV:', process.env.NODE_ENV);
console.log('   RAILWAY_ENVIRONMENT:', process.env.RAILWAY_ENVIRONMENT);
console.log('   RAILWAY_SERVICE_ID:', process.env.RAILWAY_SERVICE_ID);
console.log('   RAILWAY_DEPLOYMENT_ID:', process.env.RAILWAY_DEPLOYMENT_ID);
console.log('   HOME:', process.env.HOME);
console.log('   PATH:', process.env.PATH);
console.log('');

// 2. System Information
console.log('2. SYSTEM INFORMATION:');
console.log('   Platform:', os.platform());
console.log('   Architecture:', os.arch());
console.log('   Node Version:', process.version);
console.log('   Hostname:', os.hostname());
console.log('   Total Memory:', (os.totalmem() / 1024 / 1024 / 1024).toFixed(2), 'GB');
console.log('   Free Memory:', (os.freemem() / 1024 / 1024 / 1024).toFixed(2), 'GB');
console.log('   CPU Cores:', os.cpus().length);
console.log('');

// 3. File System
console.log('3. FILE SYSTEM:');
console.log('   Current Directory:', process.cwd());
console.log('   __dirname:', __dirname);
console.log('   Directory Contents:');
try {
  const files = fs.readdirSync(process.cwd());
  files.forEach(file => console.log('     -', file));
} catch (err) {
  console.log('     Error reading directory:', err.message);
}
console.log('');

// 4. Network Interfaces
console.log('4. NETWORK INTERFACES:');
const interfaces = os.networkInterfaces();
Object.keys(interfaces).forEach(name => {
  interfaces[name].forEach(iface => {
    console.log(`   ${name}: ${iface.address} (${iface.family})`);
  });
});
console.log('');

// 5. DNS Resolution Test
console.log('5. DNS RESOLUTION TEST:');
async function testDNS() {
  try {
    const addresses = await dns.resolve4('google.com');
    console.log('   DNS resolution working. Google.com:', addresses[0]);
  } catch (err) {
    console.log('   DNS resolution failed:', err.message);
  }
}

// 6. Port Binding Test
console.log('6. PORT BINDING TEST:');
const PORT = process.env.PORT || 5001;

async function testPortBinding() {
  // Test IPv4 binding
  await new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      res.writeHead(200);
      res.end('OK');
    });
    
    server.on('error', (err) => {
      console.log(`   ❌ IPv4 binding failed on 0.0.0.0:${PORT}:`, err.message);
      resolve();
    });
    
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`   ✅ IPv4 binding successful on 0.0.0.0:${PORT}`);
      server.close(resolve);
    });
  });

  // Test IPv6 binding
  await new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      res.writeHead(200);
      res.end('OK');
    });
    
    server.on('error', (err) => {
      console.log(`   ❌ IPv6 binding failed on :::${PORT}:`, err.message);
      resolve();
    });
    
    server.listen(PORT, '::', () => {
      console.log(`   ✅ IPv6 binding successful on :::${PORT}`);
      server.close(resolve);
    });
  });

  // Test default binding
  await new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      res.writeHead(200);
      res.end('OK');
    });
    
    server.on('error', (err) => {
      console.log(`   ❌ Default binding failed on port ${PORT}:`, err.message);
      resolve();
    });
    
    server.listen(PORT, () => {
      console.log(`   ✅ Default binding successful on port ${PORT}`);
      server.close(resolve);
    });
  });
}

// 7. External Connectivity Test
console.log('7. EXTERNAL CONNECTIVITY TEST:');
async function testConnectivity() {
  return new Promise((resolve) => {
    https.get('https://api.github.com', (res) => {
      console.log('   ✅ External HTTPS requests working. GitHub API status:', res.statusCode);
      resolve();
    }).on('error', (err) => {
      console.log('   ❌ External HTTPS requests failed:', err.message);
      resolve();
    });
  });
}

// Run all tests
async function runTests() {
  await testDNS();
  await testPortBinding();
  await testConnectivity();
  
  console.log('');
  console.log('=== DEBUG SCRIPT COMPLETE ===');
  console.log('');
}

runTests().catch(console.error);