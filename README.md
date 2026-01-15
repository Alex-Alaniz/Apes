# APES - Decentralized Prediction Market Platform

A full-stack decentralized prediction market platform built on Solana, featuring on-chain betting, parlay tournaments, and social engagement mechanics.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          APES Platform                                   │
├─────────────────────────────────────────────────────────────────────────┤
│  Frontend (React/Vite)  │  Backend (Node/Express)  │  Smart Contracts   │
│  - Wallet Integration   │  - REST API              │  - Anchor/Rust     │
│  - Market UI            │  - PostgreSQL            │  - PDAs & Escrows  │
│  - Leaderboards         │  - Real-time sync        │  - Token Burns     │
└─────────────────────────────────────────────────────────────────────────┘
```

## 🔗 Deployed Contracts (Solana Mainnet)

| Contract | Address |
|----------|---------|
| Market System | `APESCaeLW5RuxNnpNARtDZnSgeVFC5f37Z3VFNKupJUS` |
| APES Token | `9BZJXtmfPpkHnM57gHEx5Pc9oQhLhJtr4mhCsNtttTts` |
| Platform State | `GD3SoR4aHLLtzY9jYZyL7qH64VA73waMtvH9KRSZ3Bgb` |
| Treasury | `APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z` |

## 🦀 Smart Contract Features

The Solana program (`src/smart_contracts/market_system/`) implements:

### Prediction Markets
- **Multi-option markets** (2-4 outcomes)
- **PDA-based escrow** for secure fund management
- **Proportional payout** calculation with u128 precision
- **Emergency withdraw** for cancelled markets

### Parlay System
- **Tournament-based** multi-selection betting
- **Dynamic multipliers** (base + increment per selection)
- **Exposure limits** to manage platform risk
- **Match resolution** with selection validation

### Security
- **Safe math** throughout (checked_add/mul/div/sub)
- **Access control** with admin + creator whitelist
- **Pool overflow protection** (MAX_POOL_SIZE)
- **Division by zero guards**
- **Escrow balance validation**

### Token Economics
- **Bet burn**: 2.5% of each bet burned
- **Claim burn**: 1.5% of winnings burned
- **Platform fee**: Configurable basis points
- **Creator fee**: Per-market fee rate

## 📁 Project Structure

```
├── src/
│   ├── smart_contracts/     # Solana/Anchor programs
│   │   └── market_system/   # Main prediction market program
│   └── frontend/            # React frontend
├── backend/                 # Express.js API server
├── docs/                    # Documentation
│   ├── deployment/          # Deployment guides
│   ├── security/            # Security documentation
│   ├── features/            # Feature documentation
│   └── api/                 # API documentation
├── scripts/                 # Utility scripts
└── tests/                   # Integration tests
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Rust & Anchor CLI
- Solana CLI
- PostgreSQL

### Development

```bash
# Backend
cd backend
npm install
npm run dev  # Port 5001

# Frontend
cd src/frontend
npm install
npm run dev  # Port 3000

# Smart Contracts
cd src/smart_contracts/market_system
anchor build
anchor test
```

## 📖 Documentation

- [Smart Contract Deep Dive](./SMART_CONTRACT_EXPLAINED.md)
- [Running the App](./RUNNING_THE_APP.md)
- [QA Testing Checklist](./QA_TESTING_CHECKLIST.md)

## 🛡️ Security

The smart contracts implement comprehensive security measures:
- Input validation on all user-provided data
- Bounds checking for all array accesses
- Authority verification on sensitive operations
- Reentrancy protection via account constraints

See [Security Documentation](./docs/security/) for full audit details.

## 📄 License

MIT License - See LICENSE for details.
