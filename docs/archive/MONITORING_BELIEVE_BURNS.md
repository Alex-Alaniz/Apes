# Monitoring Believe API Burn Responses

## 🔍 How to See Burn Transaction Details

### 1. Automatic Console Logging

When you place a bet, create a market, or claim rewards, the console will show:

```
🔥 Believe burn successful: 1 tokens burned
📋 Believe API Response:
   Result: SUCCESS
   Hash: 7f8a9b3c2d1e4f5a6b7c8d9e0f1a2b3c...
   🔗 Burn TxHash: 2ABC...XYZ  ← This is the burn transaction hash!
   Type: PREDICTION_BUY
   Date Burned: 2025-05-31T05:00:00.000Z
```

### 2. Believe Monitor Commands

Open browser console (F12) and use these commands:

```javascript
// Show summary of all burns
believeMonitor.summary()

// Get details of last burn
believeMonitor.getLastBurn()

// Get all burn history
believeMonitor.getBurns()

// Clear burn history
believeMonitor.clear()
```

### 3. Example Output

When you run `believeMonitor.summary()`:

```
📊 BELIEVE BURN SUMMARY
Total burns: 3
✅ Successful: 3
❌ Failed: 0

📜 Recent Burns:
1. ✅ PREDICTION_BUY - 2ABC3DEF... @ 1:05:32 PM
2. ✅ PREDICTION_CLAIM - 4GHI5JKL... @ 1:03:15 PM
3. ✅ MARKET_CREATE - 6MNO7PQR... @ 1:01:45 PM
```

### 4. Detailed Burn Information

When you run `believeMonitor.getLastBurn()`:

```javascript
{
  id: 1735615823456,
  type: "PREDICTION_BUY",
  timestamp: "2025-05-31T05:10:23.456Z",
  success: true,
  message: "Successfully burned 1 tokens",
  data: {
    result: "SUCCESS",
    hash: "7f8a9b3c2d1e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d",
    txHash: "2ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqr",
    type: "PREDICTION_BUY",
    dateBurned: "2025-05-31T05:10:23.000Z"
  }
}
```

### 5. View on Blockchain Explorer

The console also provides a Solscan link:
```
🔍 View on Solscan: https://solscan.io/tx/2ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqr
```

Click this link to see the burn transaction on the blockchain!

## 📊 Network Tab Method

1. Open DevTools (F12)
2. Go to Network tab
3. Filter by "believe"
4. Look for POST requests to `tokenomics/burn`
5. Click on the request
6. Go to "Response" tab

You'll see:
```json
{
  "result": "SUCCESS",
  "hash": "7f8a9b3c2d1e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d",
  "txHash": "2ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqr",
  "type": "PREDICTION_BUY",
  "dateBurned": "2025-05-31T05:10:23.000Z"
}
```

## 🎯 Quick Test

1. Place a small bet (e.g., 1 APES)
2. Watch the console for the burn logs
3. Run `believeMonitor.getLastBurn()` to see full details
4. Copy the txHash and verify on blockchain explorer

## 💡 Tips

- The burn happens AFTER your prediction transaction succeeds
- Burns are non-blocking - they won't fail your bet
- Each burn type has fixed amounts (1 for bets/claims, 5 for markets)
- The txHash is the Solana transaction hash for the burn itself 