# APES Backend Server Architecture

## Server Files Overview

### 1. `server.js` (Original - Main Development Server)
- **Status**: PRESERVED - Original full-featured server
- **Purpose**: Local development and testing
- **Features**: All services, immediate initialization
- **Health Check**: After middleware (works locally)

### 2. `server-original-backup.js` (Backup)
- **Status**: BACKUP - Exact copy of original server.js
- **Purpose**: Preservation of original implementation
- **Created**: As safety backup before Railway optimization

### 3. `server-minimal.js` (Railway Minimal)
- **Status**: WORKING - Proven to work on Railway
- **Purpose**: Minimal server for testing deployments
- **Features**: Only health check and basic endpoints
- **Health Check**: First route, no middleware

### 4. `server-railway.js` (Railway Production)
- **Status**: ACTIVE - Optimized for Railway deployment
- **Purpose**: Production server with deferred loading
- **Features**: 
  - Immediate server start with health check
  - Full application loaded after 1 second
  - All routes including Privy integration
  - Graceful error handling
  - Service initialization after 5 seconds

## Railway Deployment Strategy

### Phase 1: Immediate Server Start (0-1 seconds)
1. Express app created
2. Health check endpoint registered FIRST
3. Server binds to 0.0.0.0:PORT
4. Railway health checks can succeed immediately

### Phase 2: Application Loading (1-5 seconds)
1. Dependencies loaded (cors, dotenv, etc.)
2. Database connection attempted
3. Security middleware applied
4. All API routes loaded:
   - Core routes: markets, predictions, users, etc.
   - Admin routes: admin endpoints, schema fixes
   - Privy routes: /api/privy authentication
   - Polymarket proxy routes
5. Error handlers registered

### Phase 3: Service Initialization (5+ seconds)
1. Background services started:
   - Tweet cache service
   - Treasury monitoring
   - Blockchain sync service
   - Market monitoring
   - Order book service
2. Services fail gracefully if not configured

## Key Features Maintained

### 1. Privy Integration ✅
- Authentication endpoints at `/api/privy`
- Multi-chain wallet support
- Server-side verification middleware

### 2. Core API Routes ✅
- Markets, predictions, users
- Leaderboards and tournaments
- Admin functions
- Polymarket integration

### 3. Security Features ✅
- Rate limiting (when available)
- CORS configuration
- Request validation
- Input sanitization

### 4. Database Operations ✅
- Connection pooling
- Schema migrations
- Transaction support

### 5. Background Services ✅
- Blockchain synchronization
- Market monitoring
- Treasury management
- Automated payouts

## Environment Variables Required

```env
# Core
PORT=5001
NODE_ENV=production
DATABASE_URL=postgresql://...

# Authentication
ADMIN_WALLETS=wallet1,wallet2
PRIVY_APP_ID=cmfmo7so5004ojz0bl03kuy1l
PRIVY_APP_SECRET=...

# Services
SOLANA_RPC_URL=...
POLYGON_RPC_URL=...
POLYMARKET_API_KEY=...
POLYMARKET_API_SECRET=...

# Optional
TWITTER_BEARER_TOKEN=...
ENCRYPTION_PASSWORD=...
```

## Deployment Commands

### Local Development
```bash
cd backend
npm run dev  # Uses server.js with nodemon
```

### Railway Production
```bash
# Configured in railway.json
cd backend && node server-railway.js
```

### Testing Minimal
```bash
cd backend && node server-minimal.js
```

## Health Check Requirements

1. **Must be first route** - Before ANY middleware
2. **Simple response** - Just status and timestamp
3. **No dependencies** - No database or service calls
4. **IPv4 binding** - Server must bind to 0.0.0.0

## Migration Path

1. **Current**: Using `server-railway.js` for production
2. **Fallback**: Can use `server-minimal.js` if issues arise
3. **Future**: May merge optimizations back to `server.js`

## Important Notes

- Never delete `server-original-backup.js` - It's our reference
- `server-railway.js` includes ALL functionality from original
- Services that fail to load don't crash the server
- Health checks work even if everything else fails
- Privy integration is fully preserved