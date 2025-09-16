# Running Local Frontend with Production Backend

## Option 1: Quick Switch (Easiest)

Simply update the `VITE_API_URL` in your `.env` file:

```bash
cd src/frontend

# Edit .env file and change:
# FROM: VITE_API_URL=http://localhost:5001
# TO:   VITE_API_URL=https://apes-production.up.railway.app
```

Then run:
```bash
npm run dev
```

## Option 2: Use Environment File

```bash
cd src/frontend

# Copy the production backend env file
cp .env.production-backend .env

# Run frontend
npm run dev
```

## Option 3: Command Line Override

```bash
cd src/frontend

# Run with production backend
VITE_API_URL=https://apes-production.up.railway.app npm run dev
```

## ⚠️ Important Considerations

### 1. **Privy Testing**
- ❌ **Won't work** - Production backend doesn't have Privy routes yet
- Need to deploy Privy changes to production first
- Or run local backend for Privy testing

### 2. **CORS**
- ✅ **Should work** - Production backend allows localhost:3000
- If you get CORS errors, the backend needs to be updated

### 3. **Authentication**
- ✅ **Will work** - Wallet signatures work across environments
- Your local wallet can authenticate with production

### 4. **Database**
- ⚠️ **Be careful** - You'll be using production data
- Any bets/actions will be real on mainnet

## Recommended Approach

### For Privy Testing:
```bash
# Run BOTH locally since Privy isn't deployed yet
cd backend && npm run dev  # Terminal 1
cd src/frontend && npm run dev  # Terminal 2
```

### For General Testing (without Privy):
```bash
# Use production backend
cd src/frontend
VITE_API_URL=https://apes-production.up.railway.app npm run dev
```

## Quick Test

To verify which backend you're using:

1. Open browser console
2. Check network tab
3. API calls should go to:
   - Local: `http://localhost:5001/api/...`
   - Production: `https://apes-production.up.railway.app/api/...`

## Switching Back

To switch back to local backend:
```bash
# Edit .env
VITE_API_URL=http://localhost:5001

# Or use the original .env
cp .env.example .env
```