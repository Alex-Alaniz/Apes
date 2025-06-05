# Testing Believe API Burns - Quick Guide

## ✅ Quick Checklist

1. **Clear Browser Cache First!**
   - Mac: `Cmd + Shift + R`
   - Windows: `Ctrl + Shift + R`
   - Or open in Incognito/Private window

2. **Create a Test Market**
   - Go to: http://localhost:3000/admin
   - Click "Create Market"
   - Use this data:
     ```
     Question: Will the Believe API burn exactly 1 APES token (not 1 million)?
     Option 1: Yes ✅
     Option 2: No ❌
     End Date: Tomorrow
     End Time: Any future time
     Min Bet: 1
     Creator Fee: 2.5
     Category: Testing
     ```

3. **Place a Test Bet**
   - Find your new market in the Markets page
   - Click "View Details"
   - Place a bet (e.g., 1 APES)
   - **WATCH THE BROWSER CONSOLE!**

## 🔍 What to Look For

### In Browser Console:
```javascript
🔥 Believe burn successful: 1 tokens burned
```

### In Network Tab (F12 → Network):
Look for request to `public.believe.app` with:
```json
{
  "type": "PREDICTION_BUY",
  "proof": {
    "userWallet": "...",
    "optionIndex": 0,
    ...
  },
  "burnAmount": 1,  // ← THIS SHOULD BE 1, NOT 1000000!
  "persistOnchain": true
}
```

### In Response:
```json
{
  "result": "SUCCESS",
  "hash": "...",
  "txHash": "...",
  "type": "PREDICTION_BUY",
  "dateBurned": "..."
}
```

## ❌ If You Still See burnAmount: 1000000

1. **Force Clear Cache**:
   - Chrome: Settings → Privacy → Clear browsing data → Cached images and files
   - Or use Developer Tools → Application → Storage → Clear site data

2. **Try Different Browser** or Incognito mode

3. **Restart Frontend**:
   ```bash
   # Stop frontend (Ctrl+C in terminal)
   # Start again
   npm run dev
   ```

## 📊 Verify in Believe Dashboard

After successful burn, check:
- Burn amount should be **1 APES** (not 1,000,000)
- Transaction should show in your burn history

## 🎯 Test All Three Burn Types

1. **Prediction Bet**: Place a bet → Should burn 1 APES
2. **Claim Reward**: Win and claim → Should burn 1 APES  
3. **Market Creation**: Create a market → Should burn 5 APES

Each should show the EXACT burn amount, not multiplied by 1,000,000! 