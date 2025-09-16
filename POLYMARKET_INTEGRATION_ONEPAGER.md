# APES Polymarket Integration - Quick Reference

## 🎯 Overview
Transform APES into a utility token by providing multi-platform access to Polymarket's liquidity with tiered fee benefits based on holdings.

## 🏗️ What We've Built

### 1. **Backend Infrastructure** ✅
- `polymarketProxyService.js` - Proxy layer for Polymarket CLOB
- `orderBookService.js` - Aggregates liquidity from multiple sources
- Database schemas for orders, fees, and user tiers

### 2. **Chrome Extension** ✅
- Overlays APES benefits on polymarket.com
- Shows real-time fee savings
- One-click betting with wallet integration
- Files: `chrome-extension/` directory

### 3. **Telegram Bot** ✅
- Full trading interface in chat
- Market browsing and betting
- Social features (leaderboards, copy trading)
- File: `telegram-bot/index.js`

### 4. **Fee Structure** ✅
| APES Holdings | Fee | Savings |
|---------------|-----|---------|
| 0-999 | 1.00% | 0% |
| 1,000+ | 0.75% | 25% |
| 10,000+ | 0.50% | 50% |
| 50,000+ | 0.30% | 70% |
| 100,000+ | 0.20% | 80% |

## 🚀 Quick Start

### Prerequisites
```bash
# Required environment variables
POLYGON_RPC_URL=https://polygon-rpc.com
POLYMARKET_API_KEY=your_key_if_available
TELEGRAM_BOT_TOKEN=your_bot_token
ENCRYPTION_PASSWORD=secure_password_for_wallets
```

### Backend Setup
```bash
cd backend
npm install

# Run migrations (use the fixed version!)
node scripts/run-polymarket-migration.js

# Test encryption
node scripts/test-encryption.js

# Run integration tests
node scripts/test-polymarket-integration.js

# Start services
npm run dev
```

### Chrome Extension
```bash
cd chrome-extension
# Add icon files to icons/ directory
# Load unpacked in Chrome Developer Mode
# Test on polymarket.com
```

### Telegram Bot
```bash
cd telegram-bot
npm install
npm start
```

## 📊 Revenue Model
- **Platform fees**: 0.2% - 1.0% based on tier
- **Distribution**: 40% buyback, 30% dev, 20% LP, 10% referral
- **Projected**: $75k-$1.5M monthly revenue

## 🔧 Key Components

### API Endpoints
- `POST /api/polymarket/place-order` - Execute trades
- `GET /api/polymarket/positions` - User positions
- `GET /api/polymarket/stats` - Platform statistics
- `GET /api/orderbook/:market` - Aggregated liquidity

### Database Tables
- `polymarket_orders` - All orders placed
- `platform_fees` - Fee tracking
- `user_fee_tiers` - Tier management
- `copy_trading_subscriptions` - Social trading

### Security
- Proxy wallets with encrypted keys
- Rate limiting per user
- Multi-sig treasury planned
- HSM for production

## ⚡ Deployment Checklist

- [ ] Deploy backend to Railway/Vercel
- [ ] Set up PostgreSQL database
- [ ] Configure environment variables
- [ ] Deploy Chrome extension to Web Store
- [ ] Register Telegram bot with @BotFather
- [ ] Set up monitoring (Datadog/Grafana)
- [ ] Configure backup RPC endpoints
- [ ] Set up error tracking (Sentry)
- [ ] Create admin dashboard
- [ ] Launch marketing campaign

## 📈 Success Metrics
- Daily Active Users (target: 1,000 in month 1)
- Total Volume (target: $1M in month 1)  
- Average Fee Rate (monitor tier distribution)
- User Retention (target: 40% month-over-month)
- APES Price Impact (measure buyback effect)

## 🔗 Resources
- [Full Technical Plan](docs/POLYMARKET_INTEGRATION_PLAN.md)
- [Whitepaper](docs/APES_POLYMARKET_WHITEPAPER.md)
- [API Documentation](backend/services/polymarketProxyService.js)
- [Database Schema](backend/migrations/create_polymarket_proxy_tables.sql)

## 🚨 Important Notes
1. **Regulatory**: Not available in restricted jurisdictions
2. **Security**: Never store unencrypted private keys
3. **Scaling**: Monitor RPC rate limits carefully
4. **Support**: Set up 24/7 monitoring for production

---
*Last Updated: December 2024 | Version 1.0*