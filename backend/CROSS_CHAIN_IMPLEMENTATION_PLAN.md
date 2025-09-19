# Cross-Chain Integration Implementation Plan

## Overview
This document outlines the implementation plan for adding cross-chain trading capabilities to APES, allowing users to participate in Polymarket (Polygon) and Kalshi markets from Solana.

## Confidence Levels
- **Relay.link Integration**: 86% ✅
- **Kalshi Integration**: 95% ✅
- **Overall Architecture**: 90% ✅

## Architecture Decision

### Recommended Approach: Dual Integration
1. **Kalshi Markets**: Direct API integration (no bridging needed)
2. **Polymarket**: Relay.link for cross-chain bridging

### Why This Approach?
- Kalshi uses fiat deposits, no crypto bridging required
- Polymarket requires USDC on Polygon
- Relay.link proven to work for Solana↔Polygon USDC transfers
- Maintains non-custodial approach where possible

## Phase 1: Kalshi Integration (Week 1-2)

### 1.1 Authentication Service
```javascript
// backend/services/kalshiAuthService.js
class KalshiAuthService {
  constructor(keyId, privateKeyPath) {
    this.keyId = keyId;
    this.privateKey = fs.readFileSync(privateKeyPath, 'utf8');
  }
  
  generateSignature(method, path, timestamp) {
    // RSA-PSS signature implementation
  }
}
```

### 1.2 Market Sync Service
```javascript
// backend/services/kalshiMarketService.js
- Sync Kalshi markets to database
- Map to APES market format
- Handle real-time updates via WebSocket
```

### 1.3 Database Updates
```sql
ALTER TABLE markets ADD COLUMN kalshi_ticker VARCHAR(255);
ALTER TABLE markets ADD COLUMN external_source VARCHAR(50) DEFAULT 'apes';

CREATE TABLE kalshi_orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  kalshi_order_id VARCHAR(255),
  status VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 1.4 API Endpoints
- `GET /api/kalshi/markets` - List available markets
- `POST /api/kalshi/orders` - Place order
- `GET /api/kalshi/positions` - User positions
- `GET /api/kalshi/balance` - Account balance

## Phase 2: Relay.link Integration (Week 2-3)

### 2.1 Bridge Service
```javascript
// backend/services/relayBridgeService.js
class RelayBridgeService {
  async getQuote(params) {
    // Validate addresses based on chain
    // Call Relay.link quote API
    // Return formatted quote
  }
  
  async executeBridge(quoteId, userSignature) {
    // Requires API key
    // Execute bridge transaction
  }
}
```

### 2.2 API Endpoints
- `POST /api/bridge/quote` - Get bridge quote
- `POST /api/bridge/execute` - Execute bridge
- `GET /api/bridge/status/:txId` - Transaction status

### 2.3 Frontend Components
```javascript
// src/frontend/src/components/BridgeModal.jsx
- Show bridge quote with fees
- Confirm transaction
- Track bridge progress
```

## Phase 3: Polymarket Enhancement (Week 3-4)

### 3.1 Update Proxy Service
```javascript
// backend/services/polymarketProxyService.js
- Add bridge integration
- Check user balances on Polygon
- Prompt for bridging when needed
```

### 3.2 User Flow
1. User selects Polymarket market
2. System checks Polygon USDC balance
3. If insufficient, show bridge option
4. Execute bridge via Relay.link
5. Place order on Polymarket

## Implementation Timeline

### Week 1
- [ ] Create Kalshi auth service
- [ ] Implement market sync
- [ ] Add database migrations
- [ ] Basic API endpoints

### Week 2
- [ ] Complete Kalshi order flow
- [ ] Start Relay.link service
- [ ] Get API keys from Relay team
- [ ] Test quote endpoints

### Week 3
- [ ] Implement bridge execution
- [ ] Add frontend bridge UI
- [ ] Integrate with Polymarket flow
- [ ] Error handling

### Week 4
- [ ] Testing and debugging
- [ ] Performance optimization
- [ ] Documentation
- [ ] Mainnet deployment

## Environment Variables

```env
# backend/.env additions
# Kalshi
KALSHI_API_KEY_ID=your-key-id
KALSHI_PRIVATE_KEY_PATH=./keys/kalshi-private.pem
KALSHI_API_URL=https://demo-api.kalshi.co
USE_KALSHI_INTEGRATION=true

# Relay.link
RELAY_API_KEY=your-api-key
RELAY_API_URL=https://api.relay.link
USE_RELAY_BRIDGE=true
```

## Security Considerations

1. **API Keys**: Store in secure vault, never in code
2. **Private Keys**: Use HSM or KMS in production
3. **User Funds**: Non-custodial approach, users control keys
4. **Bridge Limits**: Implement per-user daily limits
5. **Error Recovery**: Handle failed bridges gracefully

## Testing Strategy

1. **Unit Tests**: Mock all external APIs
2. **Integration Tests**: Use demo environments
3. **E2E Tests**: Test full flow with test funds
4. **Load Tests**: Ensure system scales
5. **Security Audit**: Before mainnet launch

## Risk Mitigation

1. **API Downtime**: Implement circuit breakers
2. **Bridge Failures**: Clear error messages, support contact
3. **Rate Limits**: Queue system for API calls
4. **Price Volatility**: Show warnings during high volatility
5. **Regulatory**: Terms of service updates

## Success Metrics

- Bridge success rate > 95%
- Average bridge time < 5 minutes
- User satisfaction > 4.5/5
- Zero fund loss incidents
- API uptime > 99.9%

## Next Steps

1. **Immediate**: Request API keys from both services
2. **This Week**: Start Phase 1 implementation
3. **Review**: Weekly progress meetings
4. **Launch**: Soft launch with limited users

This plan provides a clear path forward with 90%+ confidence of successful implementation.