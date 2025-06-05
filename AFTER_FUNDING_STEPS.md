# 🚀 AFTER FUNDING: Mainnet Deployment Steps

## ✅ **Fixed WebSocket Configuration**
- **Corrected**: Using Helius WebSocket instead of Alchemy
- **WebSocket URL**: `wss://mainnet.helius-rpc.com/?api-key=4a7d2ddd-3e83-4265-a9fb-0e4a5b51fd6d`
- **RPC URL**: `https://solana-mainnet.g.alchemy.com/v2/LB4s_CFb80irvbKFWL6qN`

---

## 💰 **Once Your Wallet is Funded (5+ SOL)**

### **Step 1: Verify Funding** ✅
```bash
# Check your mainnet balance
solana balance --url mainnet-beta

# Should show 5+ SOL for safe deployment
```

### **Step 2: Deploy Smart Contracts** 🚀
```bash
# This deploys your prediction market smart contracts to mainnet
./scripts/deploy-contracts-mainnet.sh
```

**What this will do:**
- ✅ Switch CLI to mainnet
- ✅ Generate new mainnet program keypair
- ✅ Update Anchor.toml and lib.rs with mainnet program ID
- ✅ Build and deploy smart contracts (~2-3 SOL cost)
- ✅ Initialize platform with your APES token
- ✅ Update frontend config with real program ID
- ✅ Save program ID to `MAINNET_PROGRAM_ID.txt`

**Expected Output:**
```
✅ New Mainnet Program ID: [NEW_PROGRAM_ID]
✅ Smart contract deployed to mainnet!
✅ Platform initialized!
Transaction: [TX_HASH]
Solscan: https://solscan.io/tx/[TX_HASH]
```

### **Step 3: Deploy Application** 🌐
```bash
# This deploys your frontend + backend + database
./scripts/deploy-railway.sh
```

**What this will do:**
- ✅ Create Railway project with PostgreSQL
- ✅ Deploy backend with mainnet configuration
- ✅ Deploy frontend with real program ID
- ✅ Set up production database
- ✅ Configure environment variables
- ✅ Give you live URLs

**Expected Output:**
```
Frontend URL: https://your-app.railway.app
Backend URL:  https://your-backend.railway.app
API URL:      https://your-backend.railway.app/api
```

### **Step 4: Test Everything** 🧪
```bash
# Run health checks on your deployed application
./scripts/check-deployment.sh
```

**Test Checklist:**
- [ ] Frontend loads at your Railway URL
- [ ] Wallet connects successfully
- [ ] Can view markets (should be empty initially)
- [ ] Can create test market (as admin)
- [ ] APES token balance shows correctly
- [ ] Transaction signing works

---

## 📋 **Deployment Timeline:**

1. **Fund Wallet**: 5-10 minutes (exchange processing)
2. **Deploy Contracts**: 10-15 minutes (compilation + deployment)
3. **Deploy Application**: 15-20 minutes (infrastructure setup)
4. **Testing**: 5-10 minutes (verification)

**Total: ~35-55 minutes to go live!**

---

## 💰 **Cost Breakdown:**

### **One-time Costs (SOL):**
- **Smart Contract Deploy**: ~2-3 SOL
- **Platform Initialize**: ~0.5 SOL  
- **Testing Transactions**: ~0.2 SOL
- **Buffer for Gas**: ~0.3 SOL
- **Total**: ~3-4 SOL

### **Monthly Costs (USD):**
- **Railway Hosting**: $15/month
- **Database**: Included
- **RPC/WebSocket**: Free (Alchemy + Helius)

---

## 🔧 **Configuration Status:**

### ✅ **Ready for Deployment:**
- **WebSocket**: Helius `wss://mainnet.helius-rpc.com/?api-key=...`
- **RPC**: Alchemy `https://solana-mainnet.g.alchemy.com/v2/...`
- **APES Token**: `9BZJXtmfPpkHnM57gHEx5Pc9oQhLhJtr4mhCsNtttTts`
- **Treasuries**: PRIMAPE + Community addresses configured
- **Environment**: All production files created

---

## 🚨 **Important Notes:**

1. **Mainnet is REAL**: Every transaction costs real SOL
2. **Program ID Changes**: You'll get a new program ID (not the placeholder)
3. **Test Carefully**: Start with small amounts for testing
4. **Save Everything**: Program ID, transaction hashes, URLs
5. **Monitor Closely**: Watch for any errors or issues

---

## 🆘 **If Something Goes Wrong:**

### **Smart Contract Deployment Fails:**
```bash
# Check balance
solana balance --url mainnet-beta

# Check network connection
solana config get

# Try again with more gas
# The script will retry automatically
```

### **Application Deployment Fails:**
- Check Railway dashboard for logs
- Verify environment variables are set
- Ensure program ID was updated correctly

### **WebSocket Issues:**
- Verify Helius API key is working
- Check network connectivity
- Try fallback to public WebSocket

---

## 🎯 **Success Indicators:**

### **After Smart Contracts:**
- ✅ Program visible on Solscan
- ✅ Platform state account created
- ✅ Treasury configured
- ✅ Real program ID generated

### **After Application:**
- ✅ Frontend accessible at Railway URL
- ✅ Backend API responding
- ✅ Database connected
- ✅ Wallet integration working
- ✅ APES token displaying correctly

---

## 🚀 **Ready to Deploy?**

Once you have **5+ SOL** in your mainnet wallet:

```bash
# Step 1: Verify balance
solana balance --url mainnet-beta

# Step 2: Deploy contracts (costs 3-4 SOL)
./scripts/deploy-contracts-mainnet.sh

# Step 3: Deploy application (free hosting setup)
./scripts/deploy-railway.sh

# Step 4: Test everything
./scripts/check-deployment.sh
```

**🎉 Your Solana prediction market will be LIVE on mainnet!**

---

**Let me know when you've funded the wallet and I'll guide you through each step!** 🚀 