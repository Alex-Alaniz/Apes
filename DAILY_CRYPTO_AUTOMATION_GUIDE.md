# Daily Crypto Predictions - Automation Guide

## 🤖 **Automated Market Creation System**

The daily crypto prediction markets can now be **completely automated** without any manual intervention.

## ⚡ **How Automation Works**

### **1. Cron Job Scheduling**
- **Primary**: Creates markets at **12:01 AM UTC** daily
- **Backup**: Retry at **12:30 AM UTC** if primary fails
- **Timezone**: Always UTC (consistent globally)
- **Redundancy**: Built-in error handling and retries

### **2. Market Creation Process**
```javascript
Daily at 12:01 AM UTC:
1. Check if today's markets already exist
2. If not, fetch live crypto prices (BTC, ETH, SOL)
3. Generate price prediction ranges
4. Create 3 on-chain markets via Solana program
5. Store in database with transaction signatures
6. Optional: Send Discord/Slack notifications
```

### **3. Error Handling**
- **Graceful failures**: Continues if one crypto fails
- **Backup schedule**: Retry 30 minutes later
- **Notifications**: Alerts admins of failures
- **Logging**: Detailed error tracking

## 🚀 **Implementation Options**

### **Option A: Server-Based Cron (Current)**
✅ **Already implemented** in your backend

**Features:**
- Runs automatically when server starts
- No external dependencies
- Built into Railway deployment
- Handles server restarts gracefully

**Code:**
```javascript
// Automatically starts with server
const DailyCronService = require('./services/dailyCronService');
const dailyCronService = new DailyCronService();
dailyCronService.start(); // Runs at 12:01 AM UTC daily
```

### **Option B: Railway Cron Jobs**
Railway has built-in cron job support:

```yaml
# railway.toml
[build]
builder = "NIXPACKS"

[deploy]
healthcheckPath = "/health"

[[services]]
name = "daily-crypto-cron"
schedule = "1 0 * * *"  # 12:01 AM UTC daily
command = "node scripts/create-daily-crypto-predictions.js"
```

### **Option C: GitHub Actions**
External automation via GitHub:

```yaml
# .github/workflows/daily-crypto.yml
name: Daily Crypto Markets
on:
  schedule:
    - cron: '1 0 * * *'  # 12:01 AM UTC daily
  
jobs:
  create-markets:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Market Creation
        run: |
          curl -X POST ${{ secrets.RAILWAY_API_URL }}/api/markets/trigger-daily-creation
```

## 🔧 **Manual Controls**

### **API Endpoints**

**Trigger Manual Creation:**
```bash
curl -X POST https://apes-production.up.railway.app/api/markets/trigger-daily-creation
```

**Check Automation Status:**
```bash
curl https://apes-production.up.railway.app/api/markets/cron-status
```

**Frontend Button (Admin):**
- Keep existing "Create Today's Markets" button
- Now works alongside automation
- Useful for testing and immediate creation

## 📊 **Monitoring & Notifications**

### **Discord Integration** (Optional)
Add to Railway environment:
```bash
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/your-webhook-url
```

**Success Notification:**
```
🎯 Daily Crypto Markets Created!
Successfully created 3 new prediction markets

BTC: Price: $67,432.18 - Market: APESCaeL...
ETH: Price: $3,892.44 - Market: 5X7Kn2mP... 
SOL: Price: $197.33 - Market: 9BZJXtmf...
```

**Error Notification:**
```
❌ Daily Market Creation Failed
Error: Insufficient APES balance in admin wallet
```

### **Health Monitoring**
```bash
# Check if automation is running
curl https://apes-production.up.railway.app/api/markets/cron-status

# Response:
{
  "success": true,
  "automation": {
    "enabled": true,
    "schedule": "Daily at 12:01 AM UTC",
    "backup": "Daily at 12:30 AM UTC"
  }
}
```

## 🎯 **Benefits of Automation**

### **For Users:**
- ✅ **Consistent markets** every day
- ✅ **No missed days** due to manual oversight
- ✅ **Predictable timing** (always 12:01 AM UTC)
- ✅ **Higher engagement** with reliable daily content

### **For Admins:**
- ✅ **Zero maintenance** once configured
- ✅ **Scalable** to additional cryptocurrencies
- ✅ **Error notifications** for proactive fixes
- ✅ **Backup systems** prevent failures

### **For Platform:**
- ✅ **Increased daily volume** from consistent markets
- ✅ **More APES burns** from automated activity
- ✅ **Better user retention** with daily engagement
- ✅ **Professional appearance** with reliable service

## 🔄 **Extending Automation**

### **Additional Cryptocurrencies**
Easily add more cryptos to the daily rotation:

```javascript
this.cryptos = [
    { symbol: 'BTC', name: 'Bitcoin', coingecko_id: 'bitcoin' },
    { symbol: 'ETH', name: 'Ethereum', coingecko_id: 'ethereum' },
    { symbol: 'SOL', name: 'Solana', coingecko_id: 'solana' },
    { symbol: 'DOGE', name: 'Dogecoin', coingecko_id: 'dogecoin' },    // New
    { symbol: 'ADA', name: 'Cardano', coingecko_id: 'cardano' },       // New
    { symbol: 'MATIC', name: 'Polygon', coingecko_id: 'matic-network' } // New
];
```

### **Multiple Time Periods**
- **Morning markets**: 6 AM UTC (12-hour predictions)
- **Weekly markets**: Sundays at 12:01 AM UTC
- **Monthly markets**: 1st of month at 12:01 AM UTC

### **Dynamic Difficulty**
Adjust prediction ranges based on volatility:
- **High volatility**: Wider price ranges (±15%, ±20%)
- **Low volatility**: Tighter ranges (±1%, ±3%)
- **Market conditions**: Bull/bear market adjustments

## 🛡️ **Reliability Features**

### **Admin Wallet Management**
- **Balance monitoring**: Alert if APES < 500 tokens
- **SOL monitoring**: Alert if SOL < 0.1 for fees
- **Auto-refill**: Optional integration with treasury

### **Failsafe Mechanisms**
- **Price API failures**: Use backup price sources
- **Blockchain congestion**: Retry with higher fees
- **Admin wallet issues**: Send emergency notifications

### **Scaling Protection**
- **Rate limiting**: Prevent duplicate creation attempts
- **Resource monitoring**: Track RPC usage and costs
- **Growth management**: Handle increased user volume

## 📈 **Expected Results**

With full automation:
- **100% uptime** for daily market availability
- **Consistent user engagement** every day
- **Predictable revenue** from daily betting volume  
- **Scalable growth** without manual bottlenecks

The automation system is **production-ready** and will create markets every day at 12:01 AM UTC without any manual intervention!

## 🚀 **Quick Start**

1. **Deploy current code** (automation already included)
2. **Verify admin wallet** has sufficient APES and SOL
3. **Check logs** for "Daily crypto cron service started"
4. **Test manual trigger**: `POST /api/markets/trigger-daily-creation`
5. **Wait for midnight UTC** - markets will be created automatically!

No more manual clicking required! 🎉