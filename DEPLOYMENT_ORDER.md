# 🚀 PRIMAPE Markets - Correct Deployment Order

## ✅ **Current Status:**
- **APES Token**: ✅ Already deployed and live on mainnet  
  `9BZJXtmfPpkHnM57gHEx5Pc9oQhLhJtr4mhCsNtttTts`
- **Smart Contracts**: ❌ NOT deployed to mainnet yet
- **Application**: ❌ Ready but waiting for smart contracts
- **Mainnet Balance**: ❌ 0 SOL (need 5+ SOL for deployment)
- **Devnet Balance**: ✅ 4.7 SOL (for testing only)

---

## 🎯 **CORRECT DEPLOYMENT ORDER**

### **PHASE 1: Deploy Smart Contracts FIRST** 🥇
```bash
# This deploys your prediction market smart contracts to mainnet
./scripts/deploy-contracts-mainnet.sh
```

**What this does:**
- ✅ Generates fresh mainnet program keypair
- ✅ Builds and deploys smart contracts to mainnet
- ✅ Initializes platform with your APES token
- ✅ Updates frontend config with real program ID
- ✅ Costs ~2-3 SOL

**Duration:** ~10-15 minutes

---

### **PHASE 2: Deploy Application SECOND** 🥈
```bash
# After contracts are deployed, deploy the application
./scripts/deploy-railway.sh
# OR for better performance:
./scripts/deploy-vercel.sh
```

**What this does:**
- ✅ Uses the REAL program ID from Phase 1
- ✅ Deploys frontend + backend + database
- ✅ Configures everything for mainnet
- ✅ Costs ~$10-15/month hosting

**Duration:** ~15-20 minutes

---

## 🚨 **Why This Order Matters:**

### ❌ **Wrong Order (App First):**
- App has placeholder program ID
- Frontend can't connect to contracts
- Backend can't verify transactions
- Users can't place bets
- **Result: Broken application**

### ✅ **Correct Order (Contracts First):**
- Get real program ID from deployment
- App configured with correct addresses
- Frontend connects to live contracts
- Backend verifies real transactions
- **Result: Working prediction market**

---

## 🛠️ **Pre-Deployment Checklist:**

### ✅ **Ready to Deploy:**
- [ ] 5+ SOL needed on mainnet (currently 0 SOL)
- [x] APES token live on mainnet
- [x] Wallet configured correctly
- [x] Smart contracts coded and tested
- [x] Application ready for deployment
- [x] WebSocket endpoints configured
- [x] Mainnet RPC endpoints ready

### 🔄 **During Deployment:**
1. **Phase 1**: Watch for the new program ID output
2. **Phase 2**: Use that program ID in application
3. **Verify**: Test the complete flow

---

## 🚀 **Ready to Start?**

### **Step 0: Fund Mainnet Wallet** 💰
```bash
# Buy 5-10 SOL on exchange and send to:
# APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z
```

### **Step 1: Update Configurations**
```bash
./scripts/update-mainnet-config.sh
```

**This will:**
- Add WebSocket endpoints
- Create mainnet environment files
- Test RPC connections
- Generate deployment checklist

### **Step 2: Deploy Smart Contracts**
```bash
./scripts/deploy-contracts-mainnet.sh
```

**This will:**
- Switch your CLI to mainnet
- Deploy fresh smart contracts
- Initialize with your APES token
- Give you the real program ID
- Update your frontend config

### **Step 3: Deploy Application**  
```bash
./scripts/deploy-railway.sh
```

**This will:**
- Deploy with the real program ID
- Set up production database
- Configure mainnet endpoints
- Give you live URLs

---

## 💡 **Pro Tips:**

1. **Backup First**: Your devnet setup will be preserved
2. **Watch Output**: Note the program ID from Phase 1
3. **Test Thoroughly**: Verify each phase works before proceeding
4. **Have Patience**: Mainnet deployments take time
5. **Keep Records**: Save all transaction hashes and addresses

---

## 🆘 **If Something Goes Wrong:**

**Smart Contract Deployment Issues:**
- Check SOL balance: `solana balance --url mainnet-beta`
- Verify network: `solana config get`
- Try airdrop if needed: `solana airdrop 2`

**Application Deployment Issues:**
- Verify program ID is correct
- Check environment variables
- Ensure database is connected

---

## 🎉 **Success Indicators:**

### **After Phase 1:**
- ✅ Program visible on Solscan
- ✅ Platform state initialized
- ✅ Frontend config updated

### **After Phase 2:**
- ✅ Application loads on live URL
- ✅ Wallet connects successfully  
- ✅ Can view/create markets
- ✅ Transactions work with APES

---

**🚀 Ready to deploy your Solana prediction market to mainnet? Start with Phase 1!** 