# 🚨 MAINNET PREPARATION CHECKLIST

## ❌ **Critical Issues Found:**

1. **💰 SOL Balance**: 0 SOL on mainnet (need 3-5 SOL for deployment)
2. **🔗 WebSocket**: Missing WebSocket endpoints for real-time updates
3. **📍 Program ID**: Placeholder program ID needs to be deployed

---

## 💰 **STEP 1: Fund Mainnet Wallet**

Your wallet address: `APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z`

### **Funding Options:**

#### **Option A: Buy SOL on Exchange** (Recommended)
1. **Coinbase/Binance/FTX**
   - Buy 5-10 SOL 
   - Withdraw to: `APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z`
   - Cost: ~$500-1000 (depending on SOL price)

#### **Option B: Convert from Other Crypto**
1. **Jupiter/Raydium** (if you have other Solana tokens)
2. **Cross-chain bridges** (if you have ETH/USDC on other chains)

#### **Option C: Use Existing SOL**
- Transfer from other Solana wallets you control

### **Verification:**
```bash
# Check balance after funding
solana balance --url mainnet-beta
```

**🎯 Target: 5+ SOL for safe deployment**

---

## 🔧 **STEP 2: Update Mainnet Configurations**

### **2.1 Add WebSocket Endpoints**
Your current config is missing WebSocket for real-time updates:

```javascript
// Current: Only HTTP RPC ❌
'https://solana-mainnet.g.alchemy.com/v2/LB4s_CFb80irvbKFWL6qN'

// Need: HTTP + WebSocket ✅  
rpcUrl: 'https://solana-mainnet.g.alchemy.com/v2/LB4s_CFb80irvbKFWL6qN'
wsUrl: 'wss://solana-mainnet.g.alchemy.com/v2/LB4s_CFb80irvbKFWL6qN'
```

### **2.2 Enhanced RPC Configuration**
For production, we need multiple RPC providers for reliability:

```javascript
mainnet: {
  primary: {
    rpc: 'https://solana-mainnet.g.alchemy.com/v2/LB4s_CFb80irvbKFWL6qN',
    ws: 'wss://solana-mainnet.g.alchemy.com/v2/LB4s_CFb80irvbKFWL6qN'
  },
  fallbacks: [
    {
      rpc: 'https://api.mainnet-beta.solana.com',
      ws: 'wss://api.mainnet-beta.solana.com'
    },
    {
      rpc: 'https://mainnet.helius-rpc.com',
      ws: 'wss://mainnet.helius-rpc.com'
    }
  ]
}
```

---

## 🛠️ **STEP 3: Enhanced Configuration Updates**

### **3.1 Update Frontend Config** 
```bash
# Update src/frontend/src/config/solana.js with:
# - WebSocket endpoints  
# - Rate limit handling
# - Connection resilience
# - Mainnet optimizations
```

### **3.2 Update Backend Config**
```bash
# Update backend for mainnet:
# - Proper RPC endpoints
# - WebSocket connections  
# - Error handling
# - Rate limiting
```

### **3.3 Environment Variables**
```bash
# Production .env settings:
VITE_SOLANA_NETWORK=mainnet
VITE_RPC_URL=https://solana-mainnet.g.alchemy.com/v2/LB4s_CFb80irvbKFWL6qN
VITE_WS_URL=wss://solana-mainnet.g.alchemy.com/v2/LB4s_CFb80irvbKFWL6qN
```

---

## 📋 **STEP 4: Updated Deployment Order**

### **After Funding (5+ SOL):**

1. **Update Configurations** ✅
   ```bash
   ./scripts/update-mainnet-config.sh
   ```

2. **Deploy Smart Contracts** 🚀
   ```bash
   ./scripts/deploy-contracts-mainnet.sh
   ```

3. **Deploy Application** 🌐
   ```bash
   ./scripts/deploy-railway.sh
   ```

---

## 💡 **Cost Breakdown:**

### **One-time Costs:**
- **SOL for Deployment**: 3-5 SOL (~$750-1250)
- **Smart Contract Deploy**: ~2 SOL  
- **Platform Initialize**: ~0.5 SOL
- **Testing**: ~0.5 SOL

### **Monthly Costs:**
- **Application Hosting**: $10-15/month
- **RPC/WebSocket**: Free tier (Alchemy)
- **Database**: Included in hosting

---

## 🚨 **Pre-Deployment Checklist:**

### **Before Starting:**
- [ ] 5+ SOL in mainnet wallet
- [ ] WebSocket endpoints configured
- [ ] RPC fallbacks set up
- [ ] Environment variables updated
- [ ] Backup wallet keypair
- [ ] Test transaction capability

### **Ready Indicators:**
- ✅ `solana balance --url mainnet-beta` shows 5+ SOL
- ✅ RPC endpoints respond
- ✅ WebSocket connections work
- ✅ Configurations updated

---

## 🔧 **Need Help Funding?**

**If you need help getting SOL:**

1. **DM for assistance** with exchange recommendations
2. **Check current SOL price** for budget planning  
3. **Consider OTC** if buying large amounts
4. **Use DEX aggregators** for best rates

**Once funded, we can proceed with the enhanced deployment!**

---

## 🎯 **Next Steps:**

1. **Fund wallet** with 5+ SOL
2. **Run configuration updates** 
3. **Deploy contracts with real SOL**
4. **Launch application**

**🚀 Your Solana prediction market will be live on mainnet!** 