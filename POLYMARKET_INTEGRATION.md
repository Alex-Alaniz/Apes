# APES Polymarket Integration Plan

## Overview
APES integrates with Polymarket to allow users to trade prediction markets on Polygon while holding APES tokens on Solana. This cross-chain integration provides fee discounts based on APES holdings and enables social trading features.

## Architecture

### 1. **Cross-Chain Design**
- **APES Token**: Lives on Solana blockchain
- **Trading**: Happens on Polygon via Polymarket
- **Bridge**: Users' APES balance determines fee tier, no token bridging required

### 2. **Proxy Wallet System**
Each user gets a dedicated proxy wallet:
- Automatically created on first Polymarket trade
- Private keys encrypted with AES-256-GCM
- Stored securely in PostgreSQL database
- Funded automatically when balance is low
- Enables gasless trading experience

### 3. **Fee Structure**
Platform charges fees on top of Polymarket's base fees:

| APES Holdings | Platform Fee | Savings |
|--------------|--------------|---------|
| 0 - 999      | 1.0%        | 0%      |
| 1k - 9,999   | 0.8%        | 20%     |
| 10k - 49,999 | 0.6%        | 40%     |
| 50k - 99,999 | 0.4%        | 60%     |
| 100k+        | 0.2%        | 80%     |

### 4. **Fee Distribution**
Collected fees are distributed:
- **40%**: APES token buyback and burn
- **30%**: Development fund
- **20%**: Liquidity provision
- **10%**: Referral rewards

## Technical Implementation

### Backend Services

1. **PolymarketProxyService** (`backend/services/polymarketProxyService.js`)
   - Manages proxy wallets
   - Routes orders to Polymarket
   - Tracks user positions
   - Calculates and collects fees

2. **PolymarketClobService** (`backend/services/polymarketClobService.js`)
   - WebSocket connection to Polymarket CLOB
   - EIP-712 order signing
   - Real-time order book updates
   - Trade execution

### API Endpoints

```javascript
// Get available markets
GET /api/polymarket/markets

// Get user's fee tier
GET /api/polymarket/fee-tier

// Place an order
POST /api/polymarket/order
{
  "marketId": "0x...",
  "side": "BUY", // or "SELL"
  "outcome": "YES", // or "NO"
  "amount": "100", // USDC amount
  "price": "0.65" // Price per share
}

// Get user's orders
GET /api/polymarket/orders

// Cancel an order
DELETE /api/polymarket/orders/:orderId

// Get platform statistics
GET /api/polymarket/stats

// Get leaderboard
GET /api/polymarket/leaderboard
```

### Database Schema

```sql
-- Proxy wallets
CREATE TABLE proxy_wallets (
  user_wallet VARCHAR(44) PRIMARY KEY,
  proxy_address VARCHAR(42) NOT NULL,
  encrypted_key TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders tracking
CREATE TABLE polymarket_orders (
  id SERIAL PRIMARY KEY,
  user_wallet VARCHAR(44) NOT NULL,
  market_id VARCHAR(66) NOT NULL,
  order_id VARCHAR(66) UNIQUE,
  side VARCHAR(4),
  outcome VARCHAR(3),
  amount DECIMAL(20, 6),
  price DECIMAL(10, 4),
  status VARCHAR(20),
  platform_fee DECIMAL(20, 6),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Platform fees
CREATE TABLE platform_fees (
  id SERIAL PRIMARY KEY,
  order_id VARCHAR(66),
  amount DECIMAL(20, 6),
  fee_tier DECIMAL(4, 3),
  distributed BOOLEAN DEFAULT FALSE
);
```

## User Flow

1. **Connect Wallet**: User connects Solana wallet to APES
2. **Browse Markets**: Fetch available markets from Polymarket
3. **Check Fee Tier**: System checks user's APES balance
4. **Place Order**: 
   - User submits order through APES UI
   - System creates/uses proxy wallet
   - Signs order with proxy wallet
   - Submits to Polymarket CLOB
5. **Track Position**: Updates stored in database
6. **Claim Winnings**: Automatically sent to user's Solana wallet

## Security Measures

1. **Encryption**: All private keys encrypted at rest
2. **Rate Limiting**: API endpoints protected
3. **Transaction Limits**: Daily/per-trade limits
4. **Monitoring**: Anomaly detection on proxy wallets
5. **Access Control**: Admin-only fund management

## Current Status

✅ **Completed**:
- Proxy wallet system
- CLOB integration
- Fee tier calculations
- Database schema
- API endpoints
- Mock service for testing

⚠️ **In Progress**:
- Switch from mock to live service
- Frontend UI for Polymarket markets
- Real-time WebSocket updates
- Social trading features

❌ **TODO**:
- Chrome extension
- Telegram bot
- Copy trading implementation
- Advanced analytics
- Mobile app support

## Environment Variables

```env
# Required for Polymarket integration
POLYMARKET_API_KEY=your-api-key
POLYMARKET_API_SECRET=your-api-secret
POLYGON_RPC_URL=https://polygon-rpc.com
ENCRYPTION_PASSWORD=min-32-character-password
USE_POLYMARKET_CLOB=true
```

## Testing

```bash
# Test CLOB connection
node backend/scripts/test-polymarket-clob.js

# Test full integration
node backend/scripts/test-polymarket-integration.js

# Run database migrations
node backend/scripts/run-polymarket-migration.js
```

## Revenue Projections

Based on Polymarket's volume:
- Average daily volume: $10M
- APES market share target: 1% = $100k daily
- Average platform fee: 0.6% = $600 daily revenue
- Annual projection: ~$220k platform revenue

## Next Steps

1. **Enable Live Trading**: Switch USE_MOCK to false
2. **Build UI**: Create Polymarket section in frontend
3. **Launch Beta**: Test with small group
4. **Marketing**: Highlight fee savings for APES holders
5. **Expand**: Add more prediction market platforms