# Railway Deployment Troubleshooting Guide

## Current Issue: Health Check Failures Despite Successful Build

### Symptoms
- Build completes successfully
- Health checks fail with "service unavailable"
- Container appears to not start properly
- Same configuration worked 5 days ago

## Root Causes Identified

### 1. **Configuration File Confusion**
- Multiple `railway.json` files in different directories
- Railway may be picking the wrong configuration
- **FIXED**: Removed duplicate files, kept only root `/railway.json`

### 2. **Network Binding Issues**
- Railway health checker uses IPv4
- Node.js may default to IPv6 (`::`) binding
- **FIXED**: Updated servers to explicitly bind to `0.0.0.0`

### 3. **Start Command Mismatch**
- Documentation suggests `server-minimal.js` but config used `npm start`
- **FIXED**: Updated to use `server-minimal.js` for faster startup

### 4. **Health Check Timing**
- Services may take too long to start
- Health check timeout set to 300 seconds (5 minutes)

## Applied Fixes

### 1. Updated railway.json
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "nixpacks",
    "buildCommand": "cd backend && npm install"
  },
  "deploy": {
    "startCommand": "cd backend && node server-minimal.js",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 300,
    "restartPolicyType": "on_failure",
    "restartPolicyMaxRetries": 3
  }
}
```

### 2. Network Binding Updates
- `server.js`: Now explicitly binds to `0.0.0.0`
- `server-minimal.js`: Already binds to `0.0.0.0`

### 3. Enhanced Logging
Added comprehensive environment logging to `server-minimal.js`:
- Railway environment variables
- Network configuration
- System information
- Startup timestamps

### 4. Removed Duplicate Configs
- Deleted `/backend/railway.json`
- Deleted `/src/railway.json`
- Kept only root `/railway.json`

## Debugging Tools

### railway-debug.js
Created a comprehensive debug script that tests:
1. Environment variables
2. System information
3. File system access
4. Network interfaces
5. DNS resolution
6. Port binding (IPv4, IPv6, default)
7. External connectivity

Run with: `node backend/railway-debug.js`

## Common Railway Issues (2024-2025)

### 1. IPv6 vs IPv4
- Railway health checks use IPv4
- Services binding to `::` (IPv6) will fail health checks
- Always bind to `0.0.0.0` for IPv4 compatibility

### 2. PORT Environment Variable
- Must use `process.env.PORT`
- Railway dynamically assigns ports
- Default to 5001 for local development

### 3. Working Directory
- Railway runs from repository root
- Use `cd backend` in commands
- Avoid `"root": "backend"` in railway.json

### 4. Health Check Requirements
- Must return 200 status code
- Must respond within timeout period
- JSON responses recommended over plain text

## Next Steps if Issues Persist

1. **Check Railway Logs**
   - Look for startup errors
   - Check enhanced environment logging
   - Verify PORT is being set

2. **Test Minimal Server Locally**
   ```bash
   cd backend
   PORT=8080 node server-minimal.js
   curl http://localhost:8080/health
   ```

3. **Increase Health Check Timeout**
   - Current: 300 seconds
   - Can increase if needed via railway.json

4. **Use Debug Script**
   - Deploy with `railway-debug.js` temporarily
   - Captures detailed environment info

5. **Check for Process Crashes**
   - Look for uncaught exceptions
   - Check memory limits
   - Verify all dependencies installed

## Railway-Specific Environment Variables
- `RAILWAY_ENVIRONMENT`: deployment environment
- `RAILWAY_SERVICE_ID`: unique service identifier
- `RAILWAY_DEPLOYMENT_ID`: deployment identifier
- `PORT`: dynamically assigned port (must use this!)

## Contact Railway Support If
- Logs show server starting but health checks still fail
- IPv4 binding confirmed but connections refused
- No errors in logs but container won't stay running