# Running PRIMAPE Markets Platform

This guide explains how to run both the backend and frontend of the PRIMAPE Markets platform, and how to test the Believe API integration.

## Prerequisites

- Node.js v16+ and npm
- Access to Solana devnet or mainnet
- (Optional) Believe API key for token burn functionality

## Environment Setup

### 🔴 IMPORTANT: Environment File Locations

- **Backend .env**: Create at `/backend/.env`
- **Frontend .env**: Create at `/src/frontend/.env`

### 1. Backend Configuration

Create file at `/backend/.env`:
```env
# Database connection
DATABASE_URL=your-database-url
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key

# Solana RPC
SOLANA_RPC_URL=https://api.devnet.solana.com

# Server port
PORT=5001
```

### 2. Frontend Configuration

Create file at `/src/frontend/.env`:
```env
# Believe API (optional - burns will be disabled if not set)
VITE_BELIEVE_API_KEY=your-believe-api-key
VITE_BELIEVE_API_URL=https://public.believe.app/v1

# API endpoint - MUST point to backend server (port 5001)!
VITE_API_URL=http://localhost:5001
```

**Note about Believe API:**
- The default URL is `https://public.believe.app/v1` (not `https://api.believe.app/v1`)
- You only need to set `VITE_BELIEVE_API_URL` if using a different endpoint
- Get your API key from [https://believe.app](https://believe.app)

### ⚠️ Common Mistake
**VITE_API_URL must be `http://localhost:5001`** (backend API), NOT port 3000!
- Port 3000 = Frontend (where the UI runs)
- Port 5001 = Backend API (where the frontend sends requests)

## Running the Application

### Method 1: Using the Run Script (Recommended)

```bash
# From project root
./run-dev.sh
```

This script will:
- Start the backend server on port 5001
- Start the frontend dev server on port 3000
- Handle graceful shutdown with Ctrl+C

### Method 2: Running Separately

**Terminal 1 - Backend:**
```bash
cd backend
npm install  # First time only
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd src/frontend
npm install  # First time only
npm run dev
```

### Method 3: Using PM2 (Production-like)

```bash
# Install PM2 globally
npm install -g pm2

# Start services
pm2 start backend/server.js --name "primape-backend"
pm2 start "npm run dev" --name "primape-frontend" --cwd src/frontend

# View logs
pm2 logs

# Stop services
pm2 stop all
```

## Testing Believe API Integration

### 1. Using the Node.js Test Script

```bash
# From project root
node scripts/test-believe-api-burn.js
```

This comprehensive test script will:
- Check your Believe API configuration
- Test all three burn types (prediction, claim, market creation)
- Retrieve burn proofs
- Show burn history

### 2. Using Browser Console

Once the frontend is running:

1. Open the app in your browser (http://localhost:3000)
2. Open the browser console (F12)
3. Run: `testBelieveApi()`

This will test all Believe API endpoints directly from the browser.

### 3. Testing Through the UI

1. **Test Prediction Burn:**
   - Navigate to any active market
   - Click "Place Prediction"
   - Submit a bet
   - Check console for burn logs

2. **Test Claim Burn:**
   - Find a resolved market where you won
   - Click "Claim Reward"
   - Check console for burn logs

3. **Test Market Creation Burn:**
   - Navigate to Create Market (if authorized)
   - Create a new market
   - Check console for burn logs

## Monitoring Believe API Burns

### Check Burn Status
- All burns are logged in the browser console
- Burn IDs are included in the response
- Burns happen asynchronously (non-blocking)

### Verify Burns
- Successful burns return a burn ID and transaction hash
- Failed burns are logged but don't fail user transactions
- Check the console for detailed burn information

## Common Issues

### Backend Won't Start
- Check if port 5001 is already in use: `lsof -i :5001`
- Verify database connection in `.env`
- Check logs: `npm run dev`

### Frontend Won't Connect to Backend
- Ensure backend is running on port 5001
- Check CORS settings in backend
- Verify `VITE_API_URL` in frontend `.env`

### Believe API Not Working
- Verify `VITE_BELIEVE_API_KEY` is set correctly
- Check API key permissions
- Look for error messages in console
- Burns are optional - the app works without them

### RPC Issues
- The app uses multiple RPC endpoints with automatic failover
- Check the RPC Status indicator (bottom right)
- Yellow = slow, Red = issues
- Frontend will automatically switch to backup RPCs

## Development Tips

1. **Watch Console Logs:**
   - Backend logs all API requests
   - Frontend logs transaction details
   - Believe burns are logged with emojis 🔥

2. **Testing Different Scenarios:**
   - Use devnet for testing (free SOL from faucet)
   - Test with small amounts first
   - Monitor your token balance

3. **Debugging Transactions:**
   - Transaction signatures are logged
   - Use Solana Explorer to verify on-chain
   - Check for timeout warnings (transactions may succeed even if confirmation times out)

## Production Deployment

For production:
1. Set all environment variables properly
2. Use mainnet RPC endpoints
3. Enable HTTPS
4. Set up proper logging
5. Configure rate limiting
6. Monitor Believe API usage 