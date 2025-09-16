#!/usr/bin/env node

// Railway deployment debugging script
console.log('🔍 RAILWAY DEPLOYMENT DEBUG SCRIPT');
console.log('===================================');

// Environment variables
console.log('\n📊 ENVIRONMENT VARIABLES:');
console.log('PORT:', process.env.PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('RAILWAY_ENVIRONMENT:', process.env.RAILWAY_ENVIRONMENT);
console.log('RAILWAY_SERVICE_ID:', process.env.RAILWAY_SERVICE_ID);
console.log('RAILWAY_DEPLOYMENT_ID:', process.env.RAILWAY_DEPLOYMENT_ID);
console.log('HOME:', process.env.HOME);
console.log('PWD:', process.env.PWD);

// System information
console.log('\n💻 SYSTEM INFO:');
console.log('Platform:', process.platform);
console.log('Node version:', process.version);
console.log('Current directory:', process.cwd());
console.log('Script directory:', __dirname);

const os = require('os');
console.log('Hostname:', os.hostname());
console.log('Total memory:', (os.totalmem() / 1024 / 1024).toFixed(2), 'MB');
console.log('Free memory:', (os.freemem() / 1024 / 1024).toFixed(2), 'MB');
console.log('CPU count:', os.cpus().length);

// Network interfaces
console.log('\n🌐 NETWORK INTERFACES:');
const networkInterfaces = os.networkInterfaces();
Object.keys(networkInterfaces).forEach(iface => {
  console.log(`${iface}:`);
  networkInterfaces[iface].forEach(addr => {
    console.log(`  ${addr.family}: ${addr.address}`);
  });
});

// Check if we can bind to ports
console.log('\n🔌 PORT BINDING TEST:');
const net = require('net');
const testPort = process.env.PORT || 5001;

const testServer = net.createServer();
testServer.on('error', (err) => {
  console.log(`❌ Cannot bind to port ${testPort}:`, err.message);
});

testServer.on('listening', () => {
  console.log(`✅ Successfully bound to port ${testPort}`);
  testServer.close();
});

testServer.listen(testPort, '0.0.0.0');

// File system check
console.log('\n📁 FILE SYSTEM CHECK:');
const fs = require('fs');
const path = require('path');

const checkPath = (p) => {
  try {
    const stats = fs.statSync(p);
    console.log(`✅ ${p}: ${stats.isDirectory() ? 'Directory' : 'File'} exists`);
  } catch (err) {
    console.log(`❌ ${p}: Does not exist`);
  }
};

checkPath(process.cwd());
checkPath(path.join(process.cwd(), 'package.json'));
checkPath(path.join(process.cwd(), 'server.js'));
checkPath(path.join(process.cwd(), 'server-minimal.js'));
checkPath(path.join(process.cwd(), 'railway-health-check.js'));

// Package.json check
console.log('\n📦 PACKAGE.JSON:');
try {
  const packagePath = path.join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  console.log('Name:', packageJson.name);
  console.log('Version:', packageJson.version);
  console.log('Main:', packageJson.main);
  console.log('Scripts:', JSON.stringify(packageJson.scripts, null, 2));
} catch (err) {
  console.log('❌ Cannot read package.json:', err.message);
}

console.log('\n✅ Debug script completed');