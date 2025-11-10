# 🔑 Believe API Setup Guide

## 📞 **Step 1: Get New API Key**

### **Contact Believe.app:**
1. Go to [Believe.app](https://believe.app)
2. Contact support/sales for API access
3. Mention you need **SOLANA MAINNET** access for token burns

### **Required Information to Provide:**
```
Token: PRIMAPE (APES)
Contract Address: 9BZJXtmfPpkHnM57gHEx5Pc9oQhLhJtr4mhCsNtttTts
Chain: Solana Mainnet  
Use Case: Prediction Market Platform Token Burns
Website: https://apes.primape.app (when deployed)
```

### **Request These Proof Types:**
```json
{
  "proofTypes": [
    {
      "type": "PREDICTION_PLACED",
      "description": "When users place bets on prediction markets"
    },
    {
      "type": "PREDICTION_CLAIMED", 
      "description": "When users claim rewards from winning predictions"
    },
    {
      "type": "MARKET_CREATED",
      "description": "When users create new prediction markets"
    }
  ]
}
```

---

## 🔧 **Step 2: Configure API Key**

### **Backend Configuration:**
```bash
# Update backend/.env.mainnet
echo "BELIEVE_APP_API_KEY=your-new-api-key" >> backend/.env.mainnet

# Update backend/.env.production  
echo "BELIEVE_APP_API_KEY=your-new-api-key" >> backend/.env.production
```

### **Frontend Configuration:**
```bash
# Update src/frontend/.env.mainnet
echo "VITE_BELIEVE_API_KEY=your-new-api-key" >> src/frontend/.env.mainnet

# Update src/frontend/.env.production
echo "VITE_BELIEVE_API_KEY=your-new-api-key" >> src/frontend/.env.production
```

### **Quick Script to Update All Files:**
```bash
#!/bin/bash
read -p "Enter your new Believe API key: " API_KEY

# Backend files
echo "BELIEVE_APP_API_KEY=$API_KEY" >> backend/.env.mainnet
echo "BELIEVE_APP_API_KEY=$API_KEY" >> backend/.env.production

# Frontend files  
echo "VITE_BELIEVE_API_KEY=$API_KEY" >> src/frontend/.env.mainnet
echo "VITE_BELIEVE_API_KEY=$API_KEY" >> src/frontend/.env.production

echo "✅ Believe API key configured in all files!"
```

---

## 🧪 **Step 3: Test API Key**

### **Test Backend Integration:**
```bash
# Test the backend service
node -e "
const service = require('./src/backend/src/utils/believeAppService');
console.log('API Key:', service.apiKey);
service.getTokenBurnStats()
  .then(stats => console.log('✅ API Working:', stats))
  .catch(err => console.log('❌ API Error:', err.message));
"
```

### **Test Frontend Integration:**
```bash
# Run the test script
node scripts/test-believe-api-burn.js
```

### **Expected Test Results:**
```
✅ API Key: your-api-key-here (not 'test_api_key')
✅ PREDICTION_PLACED: Working
✅ PREDICTION_CLAIMED: Working  
✅ MARKET_CREATED: Working
✅ All proof types configured correctly
```

---

## 📋 **Step 4: Verify Configuration**

### **Check All Environment Files:**
```bash
# Verify backend
grep "BELIEVE_APP_API_KEY" backend/.env*

# Verify frontend  
grep "VITE_BELIEVE_API_KEY" src/frontend/.env*

# Should show your API key in multiple files
```

### **Test API Endpoint:**
```bash
curl --request GET \
  --url https://public.believe.app/v1/tokenomics/stats \
  --header 'x-believe-api-key: your-api-key-here'

# Should return burn statistics, not an error
```

---

## 🚨 **Common Issues & Solutions:**

### **Issue: "Invalid API Key"**
```bash
# Solution: Double-check the key is correct
echo $BELIEVE_APP_API_KEY  # Should not be empty or 'test_api_key'
```

### **Issue: "Proof type not found"**
```bash
# Solution: Request the missing proof types from Believe support
# They need to add: PREDICTION_CLAIMED and MARKET_CREATED
```

### **Issue: "Token not supported"**
```bash
# Solution: Verify APES token is configured in your Believe account
# Contract: 9BZJXtmfPpkHnM57gHEx5Pc9oQhLhJtr4mhCsNtttTts
```

---

## 📊 **Step 5: Monitor Burns**

### **Check Burn Activity:**
```bash
# Get burn statistics
curl --request GET \
  --url https://public.believe.app/v1/tokenomics/stats \
  --header 'x-believe-api-key: your-api-key'
```

### **Monitor Burns in App:**
- Frontend: `/burn-stats` page will show live burn data
- Backend: Check logs for successful burn transactions
- Solana: Burns appear as on-chain transactions

---

## ✅ **Success Checklist:**

- [ ] New API key obtained from Believe.app
- [ ] All 3 proof types configured (PREDICTION_PLACED, PREDICTION_CLAIMED, MARKET_CREATED)
- [ ] API key added to backend environment files
- [ ] API key added to frontend environment files  
- [ ] API key tested with curl/scripts
- [ ] Burns working for all transaction types
- [ ] No more "test_api_key" in logs

---

## 🆘 **Need Help?**

### **Contact Believe Support:**
- Email: support@believe.app
- Include: Your token contract, chain, and use case
- Request: Solana mainnet access with the 3 proof types

### **Test Commands:**
```bash
# Quick test
node scripts/test-believe-api-burn.js

# Full integration test  
node scripts/test-believe-integration.js
```

**Once configured, token burns will happen automatically on every bet, claim, and market creation!** 🔥 