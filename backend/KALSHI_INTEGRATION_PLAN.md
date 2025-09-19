# Kalshi API Integration Plan for APES Platform

## Overview
This document provides a comprehensive implementation plan for integrating Kalshi's prediction market API into the APES platform, based on thorough research of their API documentation and 2025 capabilities.

## 1. Authentication Mechanism

### Authentication Type: RSA Signature-based Authentication
Kalshi uses a custom authentication system requiring RSA public/private key pairs and request signing.

### Required Headers for Every Request:
- `KALSHI-ACCESS-KEY`: Your API Key ID
- `KALSHI-ACCESS-TIMESTAMP`: Request timestamp in milliseconds
- `KALSHI-ACCESS-SIGNATURE`: RSA-PSS signed message with SHA256

### Signature Generation Process:
```javascript
// Message format: timestamp + HTTP_METHOD + path
const msgString = timestampStr + method + path;
// Sign with RSA-PSS using SHA256
```

### Key Management:
- API keys can be created programmatically
- Private keys must be stored securely (never retrievable after creation)
- Tokens expire every 30 minutes - implement auto-refresh

## 2. Complete API Endpoints

### Base URLs:
- Production: `https://api.elections.kalshi.com/trade-api/v2`
- Demo/Testing: `https://demo-api.kalshi.co/trade-api/v2`

### Market Data Endpoints:
```
GET /markets                    # List all markets with filtering
GET /markets/{market_ticker}    # Get specific market details
GET /markets/{market_ticker}/orderbook  # Get market order book
GET /markets/{market_ticker}/candlesticks  # Historical price data
GET /markets/{market_ticker}/trades  # Recent trades
```

### Order Management Endpoints:
```
POST /orders                    # Create new order
POST /orders/batch              # Create multiple orders (max 20)
PUT /orders/{order_id}          # Modify order
DELETE /orders/{order_id}       # Cancel order
GET /orders                     # List user orders with filters
GET /orders/{order_id}          # Get specific order details
```

### Portfolio Endpoints:
```
GET /portfolio/balance          # Get account balance
GET /portfolio/positions        # Get all positions
GET /portfolio/positions/{market_ticker}  # Get position in specific market
GET /portfolio/fills            # Get trade history
GET /portfolio/settlements      # Get settlement history
```

### Event Endpoints:
```
GET /events                     # List all events
GET /events/{event_ticker}      # Get event details
GET /events/{event_ticker}/candlesticks  # Event price history
```

### API Key Management:
```
GET /api_keys                   # Get existing API keys
POST /api_keys                  # Create with public key
POST /api_keys/generate         # Auto-generate key pair
DELETE /api_keys/{api_key}      # Delete API key
```

## 3. Rate Limits and Restrictions

- API calls are rate limited based on user tier (Premier, Market Maker)
- Batch order creation limited to 20 orders per request
- WebSocket connections limited to 1 per user
- Token refresh required every 30 minutes

## 4. WebSocket/Real-time Data

### WebSocket Connection:
- Single connection endpoint for all channels
- Authentication required for private channels

### Available Channels:
```javascript
// Public channels (no auth required)
- orderbook_delta    // Order book updates
- ticker            // Price updates
- trade             // Public trades

// Private channels (auth required)
- fill              // User's fills
- position          // Position updates
- order_lifecycle   // Order status updates
```

### Subscription Format:
```json
{
  "type": "subscribe",
  "channels": ["ticker", "orderbook_delta"],
  "market_tickers": ["INXD-25JAN31", "DEMS-24"]
}
```

## 5. Error Handling

### Common Error Codes:
- 401: Authentication failed
- 403: Insufficient permissions
- 429: Rate limit exceeded
- 400: Invalid request parameters
- 404: Market/order not found

### Best Practices:
- Implement exponential backoff for rate limits
- Handle token expiration gracefully
- Validate order parameters before submission
- Check market hours before trading

## 6. SDK/Client Libraries

### Official SDKs:
- **Python**: `pip install kalshi-python`
- **TypeScript**: Available but not via npm
- **Community**: Go, Rust implementations available

### Python SDK Example:
```python
from kalshi_python.kalshi_api import KalshiAPI

# Initialize client
kalshi = KalshiAPI(
    host="https://api.elections.kalshi.com",
    key_id="your-api-key-id",
    private_key_path="path/to/private_key.pem"
)

# Get markets
markets = kalshi.get_markets(limit=10)

# Place order
order = kalshi.create_order(
    ticker="DEMS-24",
    client_order_id="unique-id",
    side="yes",
    action="buy",
    count=10,
    type="limit",
    limit_price=50
)
```

## 7. Testing Environment

- Demo API available at `https://demo-api.kalshi.co`
- Same endpoints and authentication as production
- Paper trading with virtual funds
- Separate API keys required for demo

## Implementation Plan for APES

### Phase 1: Basic Integration (Week 1-2)
1. **Create Kalshi Service Module** (`backend/services/kalshiService.js`)
   - Implement authentication with RSA signing
   - Create base HTTP client with retry logic
   - Add token refresh mechanism

2. **Market Data Integration**
   - Fetch and sync Kalshi markets to database
   - Map Kalshi market format to APES schema
   - Implement market search and filtering

3. **Database Schema Updates**
   ```sql
   -- Add to markets table
   ALTER TABLE markets ADD COLUMN kalshi_ticker VARCHAR(255);
   ALTER TABLE markets ADD COLUMN kalshi_event_ticker VARCHAR(255);
   ALTER TABLE markets ADD COLUMN external_source VARCHAR(50) DEFAULT 'apes';
   
   -- New table for Kalshi-specific data
   CREATE TABLE kalshi_markets (
     id SERIAL PRIMARY KEY,
     market_id INTEGER REFERENCES markets(id),
     kalshi_ticker VARCHAR(255) UNIQUE,
     kalshi_market_id VARCHAR(255),
     last_price INTEGER,
     volume_24h INTEGER,
     open_interest INTEGER,
     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );
   ```

### Phase 2: Trading Integration (Week 3-4)
1. **Order Proxy Service** (`backend/services/kalshiProxyService.js`)
   - Implement order placement with proper signing
   - Add order status tracking
   - Create position synchronization

2. **WebSocket Integration**
   - Real-time price updates
   - Order fill notifications
   - Position updates

3. **API Endpoints**
   ```javascript
   // New routes in backend/routes/kalshi.js
   POST /api/kalshi/orders      // Place order
   GET /api/kalshi/positions    // Get positions
   GET /api/kalshi/balance      // Get balance
   GET /api/kalshi/markets      // Get available markets
   ```

### Phase 3: UI Integration (Week 5-6)
1. **Frontend Components**
   - Add Kalshi market selector
   - Create order placement UI
   - Display real-time prices
   - Show user positions

2. **Configuration**
   - Add Kalshi settings to admin panel
   - Toggle for enabling/disabling Kalshi markets
   - Fee configuration

### Code Example: Authentication Implementation

```javascript
// backend/services/kalshiAuthService.js
const crypto = require('crypto');
const fs = require('fs');

class KalshiAuthService {
  constructor(keyId, privateKeyPath) {
    this.keyId = keyId;
    this.privateKey = fs.readFileSync(privateKeyPath, 'utf8');
  }

  generateSignature(method, path, timestamp) {
    const message = `${timestamp}${method}${path}`;
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(message);
    
    const signature = sign.sign({
      key: this.privateKey,
      padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
      saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST
    });
    
    return signature.toString('base64');
  }

  getAuthHeaders(method, path) {
    const timestamp = Date.now().toString();
    const signature = this.generateSignature(method, path, timestamp);
    
    return {
      'KALSHI-ACCESS-KEY': this.keyId,
      'KALSHI-ACCESS-TIMESTAMP': timestamp,
      'KALSHI-ACCESS-SIGNATURE': signature
    };
  }
}
```

### Environment Variables Required:
```env
# Add to backend/.env
KALSHI_API_KEY_ID=your-key-id
KALSHI_PRIVATE_KEY_PATH=./keys/kalshi-private.pem
KALSHI_API_URL=https://demo-api.kalshi.co  # Use demo for testing
KALSHI_WEBSOCKET_URL=wss://demo-api.kalshi.co
USE_KALSHI_INTEGRATION=true
```

### Security Considerations:
1. Store private keys securely (use AWS KMS or similar in production)
2. Implement request signing on backend only
3. Never expose Kalshi credentials to frontend
4. Use separate keys for production/development
5. Implement proper error handling to avoid key exposure

### Testing Strategy:
1. Use demo environment for all development
2. Create integration tests for auth and trading
3. Mock Kalshi responses for unit tests
4. Test error scenarios (expired tokens, rate limits)
5. Verify order placement in demo before production

This implementation plan provides a complete roadmap for integrating Kalshi into the APES platform, with specific endpoints, authentication details, and code examples ready for development.