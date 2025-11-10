# Live Blockchain Data System

## Overview

The Live Blockchain Data System provides **real-time market volume data** directly from the Solana blockchain for maximum user transparency and trust. This eliminates the need for periodic syncing and ensures users always see accurate, up-to-the-second data.

## 🔴 **Key Features**

### ✅ **Real-Time Data**
- **Live volume data** fetched directly from blockchain accounts
- **Live participant counts** calculated from actual prediction accounts
- **30-second caching** to balance performance with freshness
- **Automatic fallback** to cached data if blockchain is unavailable

### ✅ **Maximum Transparency**
- Clear indicators showing when data is live vs cached
- Data source attribution (`live_blockchain`, `database_fallback`, etc.)
- Last updated timestamps for all data
- User-controlled refresh capabilities

### ✅ **Robust Architecture**
- Multiple fallback layers for reliability
- Error handling with graceful degradation
- Performance optimized with smart caching
- Compatible with existing codebase

## 🏗️ **Architecture**

### Backend Components

#### 1. **LiveMarketSyncService** (`/src/backend/services/liveMarketSyncService.js`)
```javascript
// Fetches live data for a single market
await liveMarketSync.getLiveMarketData(marketAddress);

// Fetches live data for multiple markets
await liveMarketSync.getLiveMarketDataBatch(marketAddresses);

// Updates database with live data
await liveMarketSync.updateDatabaseWithLiveData(marketAddress);
```

#### 2. **Live API Endpoints** (`/src/backend/routes/markets.js`)
```javascript
// Get live data for all markets
GET /api/markets/live

// Get live data for specific market
GET /api/markets/live/:address

// Force refresh live data
POST /api/markets/refresh-live/:address

// Get cache statistics
GET /api/markets/cache-stats
```

### Frontend Components

#### 1. **MarketService Methods** (`/src/frontend/src/services/marketService.js`)
```javascript
// Fetch live data with fallback
const markets = await marketService.fetchLiveMarketsData();

// Fetch live data for specific market
const market = await marketService.fetchLiveMarketData(marketAddress);

// Force refresh live data
const result = await marketService.refreshLiveMarketData(marketAddress);

// Get cache statistics
const stats = await marketService.getLiveCacheStats();
```

#### 2. **LiveDataIndicator Component** (`/src/frontend/src/components/LiveDataIndicator.jsx`)
```jsx
<LiveDataIndicator 
  isLiveData={market.isLiveData}
  dataSource={market.dataSource}
  lastUpdated={market.lastUpdated}
  onRefresh={() => refreshMarket(market.publicKey)}
/>
```

## 🚀 **Usage Examples**

### Basic Integration

```jsx
import React, { useState, useEffect } from 'react';
import marketService from '../services/marketService';
import LiveDataIndicator from '../components/LiveDataIndicator';

const MarketsList = () => {
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLiveData = async () => {
      try {
        // Fetch live data with automatic fallback
        const liveMarkets = await marketService.fetchLiveMarketsData();
        setMarkets(liveMarkets);
        
        console.log('Live markets loaded:', liveMarkets.length);
      } catch (error) {
        console.error('Error loading markets:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLiveData();
  }, []);

  const refreshMarket = async (marketAddress) => {
    const result = await marketService.refreshLiveMarketData(marketAddress);
    if (result.success) {
      // Reload markets after refresh
      const updatedMarkets = await marketService.fetchLiveMarketsData();
      setMarkets(updatedMarkets);
    }
  };

  if (loading) return <div>Loading live data...</div>;

  return (
    <div className="space-y-4">
      {markets.map(market => (
        <div key={market.publicKey} className="market-card">
          <div className="flex justify-between items-center mb-2">
            <h3>{market.question}</h3>
            <LiveDataIndicator 
              isLiveData={market.isLiveData}
              dataSource={market.dataSource}
              lastUpdated={market.lastUpdated}
              onRefresh={() => refreshMarket(market.publicKey)}
            />
          </div>
          
          <div className="market-stats">
            <div>Volume: {market.totalVolume.toFixed(2)} APES</div>
            <div>Participants: {market.participantCount}</div>
            <div>Source: {market.dataSource}</div>
          </div>
        </div>
      ))}
    </div>
  );
};
```

### Advanced Market Detail Page

```jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import marketService from '../services/marketService';
import LiveDataIndicator from '../components/LiveDataIndicator';

const MarketDetail = () => {
  const { marketAddress } = useParams();
  const [market, setMarket] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const loadMarket = async () => {
      const marketData = await marketService.fetchLiveMarketData(marketAddress);
      setMarket(marketData);
    };
    
    loadMarket();
    
    // Set up auto-refresh every 30 seconds for live data
    const interval = setInterval(loadMarket, 30000);
    return () => clearInterval(interval);
  }, [marketAddress]);

  const forceRefresh = async () => {
    setRefreshing(true);
    try {
      const result = await marketService.refreshLiveMarketData(marketAddress);
      if (result.success) {
        const updatedMarket = await marketService.fetchLiveMarketData(marketAddress);
        setMarket(updatedMarket);
      }
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  };

  if (!market) return <div>Loading market data...</div>;

  return (
    <div className="market-detail">
      <div className="header">
        <h1>{market.question}</h1>
        <div className="flex items-center gap-3">
          <LiveDataIndicator 
            isLiveData={market.isLiveData}
            dataSource={market.dataSource}
            lastUpdated={market.lastUpdated}
            onRefresh={forceRefresh}
            showRefreshButton={true}
            size="md"
          />
          {refreshing && <span className="text-blue-400">Refreshing...</span>}
        </div>
      </div>
      
      <div className="live-stats">
        <div className="stat-card">
          <h3>Total Volume</h3>
          <p>{market.totalVolume.toFixed(2)} APES</p>
          <small>
            {market.isLiveData ? '🔴 Live' : '📊 Cached'} • 
            Updated {new Date(market.lastUpdated).toLocaleTimeString()}
          </small>
        </div>
        
        <div className="stat-card">
          <h3>Participants</h3>
          <p>{market.participantCount}</p>
          <small>Unique blockchain addresses</small>
        </div>
      </div>
      
      <div className="options">
        {market.optionPools.map((pool, index) => (
          <div key={index} className="option-card">
            <h4>{market.options[index]}</h4>
            <div className="volume">{pool.toFixed(2)} APES</div>
            <div className="percentage">{market.optionPercentages[index].toFixed(1)}%</div>
          </div>
        ))}
      </div>
    </div>
  );
};
```

## 🔧 **Configuration**

### Environment Variables

```bash
# Solana Network Configuration
VITE_SOLANA_NETWORK=mainnet  # or devnet
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=your-key

# Backend Configuration
VITE_API_URL=https://your-backend-url.com
```

### Cache Settings

```javascript
// In liveMarketSyncService.js
this.cacheExpiry = 30000; // 30 seconds (adjustable)
```

## 📊 **Data Flow**

### 1. **Live Data Request**
```
Frontend Request → Backend API → Blockchain RPC → Market Account Data → Live Calculation → Response
```

### 2. **Fallback Chain**
```
Live Data (Preferred) → Recent Cache → Database → Error Handling
```

### 3. **User Experience**
```
🔴 Live Data: Real-time blockchain data (green indicator)
📊 Cached Data: Recent data from cache (blue indicator)  
🗃️ Database: Fallback database data (orange indicator)
```

## 🚨 **Error Handling**

### Automatic Fallbacks
1. **Blockchain unavailable** → Use 30-second cache
2. **Cache expired** → Fetch fresh from blockchain
3. **RPC timeout** → Fall back to database
4. **Database error** → Return cached data with warning

### User Feedback
- **Loading states** during data fetching
- **Error indicators** when live data unavailable
- **Refresh buttons** for manual data updates
- **Timestamp displays** showing data freshness

## ⚡ **Performance Optimization**

### Caching Strategy
- **30-second cache** for balance of freshness and performance
- **Batch requests** for multiple markets
- **Parallel processing** for independent operations
- **Smart cache invalidation** on user actions

### RPC Optimization
- **Connection pooling** for blockchain requests
- **Request timeouts** to prevent hanging
- **Retry logic** for failed requests
- **Rate limiting** to prevent API abuse

## 🧪 **Testing**

### Test Live Data Endpoints

```bash
# Test live data for all markets
curl https://your-backend-url.com/api/markets/live

# Test live data for specific market
curl https://your-backend-url.com/api/markets/live/MARKET_ADDRESS

# Force refresh market data
curl -X POST https://your-backend-url.com/api/markets/refresh-live/MARKET_ADDRESS

# Check cache statistics
curl https://your-backend-url.com/api/markets/cache-stats
```

### Verify Data Freshness

```javascript
const market = await marketService.fetchLiveMarketData(marketAddress);
console.log('Data source:', market.dataSource);
console.log('Is live:', market.isLiveData);
console.log('Last updated:', market.lastUpdated);
console.log('Cache age:', Date.now() - new Date(market.lastUpdated).getTime(), 'ms');
```

## 🔮 **Future Enhancements**

### WebSocket Integration
- Real-time updates via WebSocket connections
- Live volume updates without polling
- Instant notification of new predictions

### Advanced Caching
- Redis cache for multi-server deployments
- CDN integration for global performance
- Selective cache invalidation

### Analytics
- User engagement tracking with live data
- Performance metrics for data freshness
- A/B testing for optimal refresh intervals

## 📞 **Support**

For questions about the Live Data System:

1. **Check cache stats**: `GET /api/markets/cache-stats`
2. **Force refresh**: `POST /api/markets/refresh-live/:address`
3. **Review logs**: Check browser console for live data indicators
4. **Verify connectivity**: Test blockchain RPC endpoints

---

**🎉 Result: Users now see real-time, transparent market data directly from the blockchain with automatic fallbacks for reliability!** 