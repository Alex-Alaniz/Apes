# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

APES is a decentralized prediction market platform built on Solana, featuring:
- Smart contracts for market creation and betting (Anchor framework)
- Node.js/Express backend with PostgreSQL database
- React frontend with Vite, Tailwind CSS, and Solana wallet integration
- Real-time betting, leaderboards, and social features
- Token burning mechanics (2.5% on bets, 1.5% on claims) via Believe API integration

## Key Contract Addresses (Mainnet)

- Smart Contract: `APESCaeLW5RuxNnpNARtDZnSgeVFC5f37Z3VFNKupJUS`
- APES Token: `9BZJXtmfPpkHnM57gHEx5Pc9oQhLhJtr4mhCsNtttTts`
- Platform State: `GD3SoR4aHLLtzY9jYZyL7qH64VA73waMtvH9KRSZ3Bgb`
- Treasury: `APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z`

## Development Commands

### Running Locally

```bash
# Option 1: Using the run script (recommended)
./run-dev.sh

# Option 2: Run separately
# Backend (Terminal 1)
cd backend
npm install
npm run dev  # Runs on port 5001

# Frontend (Terminal 2)
cd src/frontend  
npm install
npm run dev  # Runs on port 3000
```

### Common Commands

```bash
# Install all dependencies
npm run install:all

# Backend only
cd backend
npm run dev          # Development with nodemon
npm start           # Production
npm run db:migrate  # Run database migrations

# Frontend only  
cd src/frontend
npm run dev         # Development server
npm run build       # Production build
npm run preview     # Preview production build

# Smart contracts
cd src/smart_contracts/market_system
anchor build
anchor test
anchor deploy
```

### Testing

```bash
# Test Believe API integration
node scripts/test-believe-api-burn.js

# Test market functionality
node scripts/test-market.js

# Check platform status
node scripts/check-platform-status.js
```

## Environment Configuration

### Backend Environment (`backend/.env`)
```env
DATABASE_URL=your-database-url
SUPABASE_URL=your-supabase-url  
SUPABASE_ANON_KEY=your-supabase-anon-key
SOLANA_RPC_URL=https://api.devnet.solana.com
PORT=5001
```

### Frontend Environment (`src/frontend/.env`)
```env
VITE_BELIEVE_API_KEY=your-believe-api-key
VITE_BELIEVE_API_URL=https://public.believe.app/v1
VITE_API_URL=http://localhost:5001  # Must be 5001, NOT 3000!
```

**Important**: Frontend runs on port 3000, backend API on port 5001. VITE_API_URL must point to the backend.

## Architecture Overview

### Three-Tier Architecture

1. **Smart Contracts** (`src/smart_contracts/market_system/`)
   - Anchor framework programs for market operations
   - Handles betting, payouts, and fund security
   - Admin-controlled market creation

2. **Backend API** (`backend/`)
   - Express.js server with PostgreSQL/Supabase
   - Routes: `/api/markets`, `/api/users`, `/api/predictions`, `/api/leaderboard`
   - Services for blockchain sync, Twitter integration, Believe API burns
   - Security middleware with rate limiting and CORS

3. **Frontend** (`src/frontend/`)
   - React SPA with React Router
   - Wallet integration via @solana/wallet-adapter
   - Market components, betting UI, leaderboards
   - Real-time RPC status monitoring

### Key Services

- **Blockchain Sync**: `backend/services/blockchainSyncService.js` - Syncs on-chain data
- **Believe Integration**: `backend/services/believeAppService.js` - Handles token burns
- **Twitter Service**: `backend/services/twitterServiceV2.js` - Social features
- **Market Service**: `src/frontend/src/services/marketService.js` - Frontend market operations

### Database Schema

Main tables:
- `markets` - Market details, options, volumes
- `predictions` - User bets and outcomes  
- `users` - User profiles and stats
- `primape_tweets` - Twitter integration
- `tournaments` - Tournament markets

## Deployment

### Frontend (Vercel)
- Automatic deployment on push to main
- Set environment variables in Vercel dashboard
- Root directory: `src/frontend`

### Backend (Railway)
- Automatic deployment on push
- Add PostgreSQL database service
- Set environment variables in Railway
- Root directory: `backend`

### Smart Contracts
```bash
# Deploy to devnet
anchor deploy --provider.cluster devnet

# Deploy to mainnet
anchor deploy --provider.cluster mainnet
```

## Security Considerations

- Admin-only market creation via access control
- Rate limiting on all API endpoints
- Secure wallet authentication
- Environment variables for sensitive data
- CORS configured for production domains

## Common Issues

- **Backend won't start**: Check port 5001 availability and database connection
- **Frontend can't reach backend**: Verify VITE_API_URL is `http://localhost:5001`
- **Believe API errors**: Burns are optional - app works without API key
- **RPC issues**: Frontend has automatic failover to backup RPCs