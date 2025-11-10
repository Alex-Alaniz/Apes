# APES Prediction Market Platform - Complete Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Smart Contracts](#smart-contracts)
4. [Backend API](#backend-api)
5. [Frontend Application](#frontend-application)
6. [Cross-Chain Integration](#cross-chain-integration)
7. [Database Schema](#database-schema)
8. [Deployment](#deployment)
9. [Security](#security)
10. [Future Development](#future-development)

## Project Overview

APES is a decentralized prediction market platform built on Solana with cross-chain capabilities. The platform features:

- **Smart contract-based markets** with on-chain settlement
- **Token burning mechanics** (2.5% on bets, 1.5% on claims)
- **Cross-chain deposits** via Circle CCTP and LI.FI
- **Social features** with Twitter integration
- **Tournament system** for competitive betting
- **Leaderboards** tracking user performance
- **Admin-controlled market creation**

### Key Statistics
- **Smart Contract**: `APESCaeLW5RuxNnpNARtDZnSgeVFC5f37Z3VFNKupJUS`
- **APES Token**: `9BZJXtmfPpkHnM57gHEx5Pc9oQhLhJtr4mhCsNtttTts`
- **Treasury**: `APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z`
- **Platform State**: `GD3SoR4aHLLtzY9jYZyL7qH64VA73waMtvH9KRSZ3Bgb`

## Architecture

### Three-Tier Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                       │
│  - Vite + React Router                                    │
│  - Solana Wallet Adapter                                  │
│  - Real-time RPC monitoring                               │
│  - Cross-chain deposit UI                                 │
└─────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────┐
│                  Backend API (Express)                    │
│  - RESTful API endpoints                                  │
│  - PostgreSQL + Supabase                                  │
│  - Blockchain sync service                                │
│  - Cross-chain deposit tracking                           │
│  - Twitter integration                                    │
│  - Polymarket proxy (optional)                            │
└─────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────┐
│              Smart Contracts (Anchor)                     │
│  - Market creation & management                           │
│  - Betting & payouts                                      │
│  - Token burning via Believe API                          │
│  - Admin access control                                   │
└─────────────────────────────────────────────────────────┘
```

## Smart Contracts

### Core Programs

1. **Market System** (`src/smart_contracts/market_system/`)
   - Creates prediction markets with binary outcomes
   - Handles betting, resolution, and payouts
   - Implements token burning mechanics
   - Admin-only market creation

2. **Key Instructions**
   - `create_market`: Admin creates new market
   - `place_bet`: User bets on outcome
   - `resolve_market`: Admin resolves with winning option
   - `claim_winnings`: Winners claim payouts

### Security Features
- Admin access control list
- Minimum bet requirements
- Creator fee collection
- Automated token burns

## Backend API

### Core Services

1. **Blockchain Sync** (`backend/services/blockchainSyncService.js`)
   - Syncs on-chain market data every 5 minutes
   - Updates database with latest state
   - Handles transaction monitoring

2. **Deposit Service** (`backend/services/depositService.js`)
   - Generates deterministic deposit addresses
   - Tracks cross-chain deposits
   - Routes to best bridge option (CCTP/LI.FI)

3. **Market Monitoring** (`backend/services/marketMonitoringService.js`)
   - Checks market end times
   - Auto-resolves expired markets
   - Manages tournament states

4. **Twitter Integration** (`backend/services/twitterServiceV2.js`)
   - OAuth 2.0 authentication
   - Tweet caching and display
   - Social engagement features

5. **Treasury Monitoring** (`backend/services/treasuryMonitoringService.js`)
   - Tracks treasury balance
   - Risk management calculations
   - Automated snapshots

### API Endpoints

#### Markets
- `GET /api/markets` - List all markets
- `GET /api/markets/:id` - Get market details
- `POST /api/markets/place-bet` - Place bet
- `GET /api/markets/daily-crypto` - Crypto price markets

#### Users
- `GET /api/users/:wallet` - Get user profile
- `GET /api/users/:wallet/bets` - User bet history
- `POST /api/users/sync-wallet` - Sync wallet data

#### Deposits
- `GET /api/deposits/supported-chains` - List chains
- `GET /api/deposits/address/:chainId` - Generate address
- `GET /api/deposits/quote` - Get bridge quote
- `POST /api/deposits/process` - Process deposit

#### Admin
- `GET /api/admin/all-markets` - Admin market view
- `POST /api/admin/resolve-market` - Resolve market
- `GET /api/admin/treasury-status` - Treasury info

## Frontend Application

### Key Components

1. **MarketList** (`src/frontend/src/components/MarketList.jsx`)
   - Displays active markets
   - Real-time volume updates
   - Category filtering

2. **PredictionCard** (`src/frontend/src/components/PredictionCard.jsx`)
   - Market betting interface
   - Option selection
   - Bet placement

3. **DepositModal** (`src/frontend/src/components/DepositModal.jsx`)
   - Cross-chain deposit UI
   - QR code generation
   - Balance display

4. **WalletProvider** (`src/frontend/src/contexts/WalletProvider.jsx`)
   - Wallet connection management
   - Transaction signing
   - Network switching

### Services

1. **marketService.js**
   - Market data fetching
   - Bet transaction building
   - RPC failover logic

2. **userService.js**
   - User profile management
   - Bet history tracking
   - Stats calculation

## Cross-Chain Integration

### Deposit Infrastructure

1. **Circle CCTP** (`backend/services/cctpService.js`)
   - Native USDC bridging
   - ~$0.005 per transfer
   - No API keys required

2. **LI.FI SDK** (`backend/services/lifiService.js`)
   - Aggregates 20+ bridges
   - Multi-token support
   - Best route selection

3. **Deposit Flow**
   ```
   User → Generate Address → Deposit → Monitor → Credit Balance → Bridge (optional)
   ```

### Database Tables

```sql
-- Deposit tracking
CREATE TABLE deposit_addresses (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  chain_id INTEGER NOT NULL,
  address VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE deposits (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  chain_id INTEGER NOT NULL,
  deposit_address VARCHAR(255),
  tx_hash VARCHAR(255),
  amount DECIMAL(20, 6),
  token VARCHAR(50),
  status VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Database Schema

### Core Tables

1. **markets**
   - Market details and metadata
   - Options and volumes
   - Resolution status

2. **predictions**
   - User bets
   - Amounts and outcomes
   - Claim status

3. **users**
   - Wallet addresses
   - Stats and rankings
   - Referral tracking

4. **tournaments**
   - Tournament markets
   - Prize pools
   - Participant tracking

## Deployment

### Frontend (Vercel)
```bash
# Automatic deployment on push
# Root: src/frontend
# Environment variables in Vercel dashboard
```

### Backend (Railway)
```bash
# Automatic deployment on push
# Root: backend
# Add PostgreSQL service
# Set environment variables
```

### Smart Contracts
```bash
# Deploy to mainnet
anchor deploy --provider.cluster mainnet

# Verify deployment
solana program show APESCaeLW5RuxNnpNARtDZnSgeVFC5f37Z3VFNKupJUS
```

## Security

### Implemented Measures
1. **Rate limiting** on all endpoints
2. **CORS configuration** for allowed domains
3. **Admin wallet whitelist**
4. **Input sanitization**
5. **SQL injection prevention**
6. **XSS protection**

### Best Practices
- Environment variables for secrets
- HTTPS only in production
- Regular security audits
- Monitoring and alerts

## Future Development

### Completed Features
- ✅ Core prediction market functionality
- ✅ Token burning integration
- ✅ Cross-chain deposits
- ✅ Tournament system
- ✅ Social features
- ✅ Admin dashboard

### Pending Features
- ⏳ WebSocket real-time updates
- ⏳ Bridge execution with wallet signing
- ⏳ Mobile app
- ⏳ Advanced analytics
- ⏳ Automated market makers

### Recent Work (Cross-Chain Integration)
- Implemented permissionless deposit system
- Circle CCTP for USDC bridging
- LI.FI SDK for quote aggregation
- Deposit tracking and history
- Fixed Solana wallet compatibility issues

---

## Quick Start

### Backend
```bash
cd backend
npm install
npm run dev  # Runs on port 5001
```

### Frontend
```bash
cd src/frontend
npm install  
npm run dev  # Runs on port 3000
```

### Testing
```bash
# Test deposits
node backend/scripts/test-deposit-api.js

# Test markets
node scripts/test-market.js

# Check platform
node scripts/check-platform-status.js
```

---

Last Updated: September 2025
Version: 1.0.0