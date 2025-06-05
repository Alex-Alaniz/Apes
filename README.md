# 🦍 APES Prediction Market Platform

A decentralized prediction market platform built on Solana with real-time betting, leaderboards, and social features.

## 🚀 **LIVE ON MAINNET** ✅

- **Smart Contract**: `APESCaeLW5RuxNnpNARtDZnSgeVFC5f37Z3VFNKupJUS`
- **APES Token**: `9BZJXtmfPpkHnM57gHEx5Pc9oQhLhJtr4mhCsNtttTts`
- **Platform State**: `GD3SoR4aHLLtzY9jYZyL7qH64VA73waMtvH9KRSZ3Bgb`
- **Treasury**: `APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z`

## ✨ Features

### 🎯 **Core Betting**
- Place predictions with APES tokens
- Real-time market data and odds
- Automated payouts for winners
- Multi-option betting support

### 💰 **Tokenomics**
- **2.5% burn** on bet placement
- **1.5% burn** on reward claims  
- **1% platform fee** to treasury
- **Deflationary token model**

### 🏆 **Social & Gamification**
- Global leaderboards
- User profiles and stats
- Engage-to-Earn system
- Twitter integration
- Follow system
- Achievement tracking

### 🛡️ **Security & Trust**
- Mainnet-ready smart contracts
- Admin-only market creation
- Transparent fee structure
- Professional audit trail

## 📁 Project Structure

```
apes/
├── src/
│   ├── frontend/          # React + Vite frontend
│   ├── backend/           # Node.js + PostgreSQL API
│   └── smart_contracts/   # Solana programs
├── backend/               # Backend server
├── scripts/              # Deployment scripts
└── docs/                 # Documentation
```

## 🚀 Quick Start

### Frontend Development
```bash
cd src/frontend
npm install
npm run dev
```

### Backend Development  
```bash
cd backend
npm install
npm run dev
```

### Environment Setup
Create `.env` files:
- `src/frontend/.env` - Frontend config
- `backend/.env` - Backend config

See deployment guides for production configuration.

## 🔧 Deployment

### Frontend (Vercel)
1. Connect GitHub repo to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push

### Backend (Railway)
1. Connect GitHub repo to Railway
2. Add PostgreSQL database
3. Set environment variables
4. Deploy automatically on push

## 🎯 Environment Variables

### Frontend
```env
VITE_SOLANA_NETWORK=mainnet
VITE_PROGRAM_ID=APESCaeLW5RuxNnpNARtDZnSgeVFC5f37Z3VFNKupJUS
VITE_TOKEN_MINT=9BZJXtmfPpkHnM57gHEx5Pc9oQhLhJtr4mhCsNtttTts
VITE_API_URL=https://your-backend-url.com
```

### Backend  
```env
DATABASE_URL=your-postgresql-url
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
PROGRAM_ID=APESCaeLW5RuxNnpNARtDZnSgeVFC5f37Z3VFNKupJUS
```

## 🔗 Important Links

- **Solscan**: [View Contract](https://solscan.io/account/APESCaeLW5RuxNnpNARtDZnSgeVFC5f37Z3VFNKupJUS)
- **Token**: [APES Token](https://solscan.io/token/9BZJXtmfPpkHnM57gHEx5Pc9oQhLhJtr4mhCsNtttTts)
- **Treasury**: [Platform Treasury](https://solscan.io/account/APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z)

## 💰 Revenue Model

| Action | Fee Type | Rate | Destination |
|--------|----------|------|-------------|
| Place Bet | Burn | 2.5% | Token Supply Reduction |
| Claim Reward | Burn | 1.5% | Token Supply Reduction |
| Platform Fee | Transfer | 1% | PRIMAPE Treasury |

**Total Platform Revenue**: 1% of all betting volume  
**Token Deflationary Pressure**: 4% of all volume burned

## 🛠️ Technology Stack

- **Frontend**: React, Vite, Tailwind CSS, Framer Motion
- **Backend**: Node.js, Express, PostgreSQL
- **Blockchain**: Solana, Anchor Framework
- **Database**: Supabase/PostgreSQL
- **Deployment**: Vercel (Frontend), Railway (Backend)
- **Authentication**: Solana Wallet Adapter

## 📊 Market Features

- **Binary Markets**: Yes/No predictions
- **Multi-option Markets**: Multiple choice betting
- **Time-locked**: Markets with resolution dates
- **Admin Controlled**: Professional market curation
- **Real-time Updates**: Live betting and odds

## 🏆 Leaderboard System

- **Global Rankings**: Top predictors by accuracy
- **Engagement Points**: Social interaction rewards
- **Time-based Views**: Daily, weekly, monthly
- **Performance Stats**: Win rate, total volume, ROI

## 🔒 Security Features

- **Wallet-based Auth**: No passwords, crypto-native
- **Admin Controls**: Restricted market creation
- **Transparent Fees**: On-chain fee collection
- **Audit Trail**: All transactions on-chain

## 📄 License

This project is proprietary. All rights reserved.

## 🦍 About APES

APES is building the future of decentralized prediction markets on Solana, combining cutting-edge DeFi technology with engaging social features and sustainable tokenomics.

---

**Ready to deploy your prediction market platform!** 🚀
