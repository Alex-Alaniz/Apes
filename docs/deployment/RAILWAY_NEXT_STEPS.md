# Railway Deployment - Next Steps

## Current Status
- Using minimal server (`backend/server-minimal.js`) to ensure Railway health checks pass
- This server ONLY provides the health endpoint and basic functionality
- No database connections or background services

## Once Railway Deployment Succeeds

### Step 1: Verify Minimal Server is Running
1. Check Railway logs for "✅ Server listening on port"
2. Visit the deployment URL + `/health`
3. Should see: `{"status":"healthy","timestamp":"..."}`

### Step 2: Gradually Add Services
Once the minimal server is stable, you can switch back to the full server:

1. Update `railway.toml`:
```toml
[deploy]
startCommand = "cd backend && node server.js"
```

2. Or use the start.js wrapper:
```toml
[deploy]
startCommand = "node start.js"
```

### Step 3: Environment Variables to Check
Ensure these are set in Railway:
- `POSTGRES_URL` or `DATABASE_URL` - Database connection
- `NODE_ENV=production`
- `PRIVY_APP_ID` - From Privy dashboard
- `PRIVY_APP_SECRET` - From Privy dashboard
- Any other secrets from `.env.example`

### Step 4: Database Connection
If database connection fails:
1. Check if `POSTGRES_URL` is set correctly
2. Try adding `?sslmode=disable` to the connection string
3. Verify Railway can reach your database (network/firewall)

### Step 5: Full Server Migration
Once ready to switch to full server:

```bash
# Update railway.toml to use full server
# Then commit and push
git add railway.toml
git commit -m "Switch to full server after Railway stabilization"
git push
```

## Debugging Tips

1. **If health checks still fail with minimal server:**
   - Check Railway build logs
   - Verify PORT environment variable is being used
   - Check if any dependencies failed to install

2. **Common Railway Issues:**
   - Port binding: Always use `process.env.PORT`
   - Health checks: Must respond within timeout period
   - Memory: Check if hitting memory limits

3. **Logs to Monitor:**
   - "Starting APES minimal server..."
   - "Server listening on port..."
   - "Health check requested"

## Emergency Rollback
If full server fails, quickly rollback to minimal:
```bash
git revert HEAD
git push
```

Or just edit railway.toml to use server-minimal.js again.