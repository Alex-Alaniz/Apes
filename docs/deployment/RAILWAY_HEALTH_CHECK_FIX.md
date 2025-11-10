# Railway Health Check Solution

## Problem
Railway deployments were failing health checks despite the server starting correctly. The issue was related to:

1. **Node.js Version**: Railway was using Node 18 instead of Node 20
2. **Server File**: Confusion between `server.js` (full) and `server-minimal.js`
3. **Working Directory**: Railway runs from root, not backend directory

## Solution

### 1. Railway Configuration (`backend/railway.json`)
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "nixpacks"
  },
  "deploy": {
    "startCommand": "cd backend && node server.js",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 300,
    "restartPolicyType": "on_failure",
    "restartPolicyMaxRetries": 5
  }
}
```

### 2. Key Requirements

1. **IPv4 Binding**: Server MUST bind to `0.0.0.0` not `localhost` or `::`
   ```javascript
   app.listen(PORT, '0.0.0.0', () => {
     console.log(`Server listening on 0.0.0.0:${PORT}`);
   });
   ```

2. **Early Health Endpoint**: Define health endpoint BEFORE any middleware or service initialization
   ```javascript
   // CRITICAL: Health check MUST be first - before ANY middleware
   // This includes security headers, rate limiting, CORS, etc.
   app.get('/health', (req, res) => {
     res.status(200).json({ status: 'healthy' });
   });
   
   // Only apply middleware AFTER health check
   app.use(securityHeaders);
   app.use(cors());
   // etc...
   ```
   
   **IMPORTANT**: Security middleware (rate limiting, headers, etc.) can block Railway's health checks!

3. **Immediate Server Start**: Start HTTP server immediately, initialize services after
   ```javascript
   // Start server first
   app.listen(PORT, '0.0.0.0', async () => {
     console.log(`Server listening on 0.0.0.0:${PORT}`);
     // Initialize services after server is listening
     await initializeServices();
   });
   ```

### 3. Environment Variables

Ensure these are set in Railway:
- `PORT`: Railway provides this automatically
- `NODE_ENV`: Set to `production`
- All other required env vars (DATABASE_URL, etc.)

### 4. Package.json Scripts

Backend `package.json`:
```json
{
  "scripts": {
    "start": "node server.js",
    "start-minimal": "node server-minimal.js"
  },
  "engines": {
    "node": ">=20.0.0",
    "npm": ">=9.0.0"
  }
}
```

### 5. Debugging Tips

1. Check deployment logs: `railway logs`
2. Verify the correct file is being run (server.js vs server-minimal.js)
3. Ensure PORT environment variable is being used
4. Confirm IPv4 binding (0.0.0.0) not IPv6 (::)

### 6. Common Issues

- **"config file backend/railway.json does not exist"**: Add to git with `git add -f backend/railway.json`
- **Health check timeout**: Ensure server starts within 5 minutes
- **Wrong Node version**: Add engines field to package.json
- **Service unavailable**: Check IPv4 binding and early health endpoint

## Working Deployment Pattern

The successful pattern is:
1. Railway runs from repository root
2. Uses command: `cd backend && node server.js`
3. Server binds to `0.0.0.0:PORT`
4. Health endpoint responds immediately at `/health`
5. Services initialize after HTTP server is listening