# 🏦 APES Treasury & Escrow System - User Guide

## 🎯 How Your Funds Are Protected

### **Your Money Is Safe**
When you place a parlay bet on APES, your funds are handled through multiple layers of security designed to protect your investment and ensure fair payouts.

---

## 🔐 **Two-Layer Security System**

### **Layer 1: Smart Contract Escrow (Coming Soon)**
```
Your APES → Smart Contract Escrow → Automatic Payout
```
- **Trustless**: No humans can touch your funds
- **Automated**: Payouts happen automatically when you win
- **Transparent**: All transactions visible on Solana blockchain
- **Secure**: Funds locked in programmatic escrow until resolution

### **Layer 2: Treasury Management (Current)**
```
Your APES → Treasury Wallet → Monitored Payout System
```
- **Real-time monitoring**: Treasury balance tracked every 5 minutes
- **Risk controls**: System prevents over-exposure
- **Professional management**: Admin-controlled with full audit trail
- **Burn mechanics**: 2.5% burned on bet, 1.5% burned on claim

---

## 💰 **Treasury Fund Management**

### **Where Your Money Goes**
1. **95% to Treasury**: Held for payouts to winners
2. **2.5% Burned**: Permanently removed from APES supply
3. **Escrowed**: Separate tracking for pending payouts

### **Treasury Health Monitoring**
We continuously monitor several key metrics:

| **Metric** | **Threshold** | **Action** |
|------------|---------------|------------|
| Treasury Balance | Below 100k APES | ⚠️ Warning alerts |
| Exposure Ratio | Above 70% | ⚠️ High risk warning |
| Exposure Ratio | Above 90% | 🚨 Stop accepting bets |
| Single Bet | Above 10% of treasury | ❌ Reject bet |

### **What This Means for You**
- ✅ **Your funds are protected** by exposure limits
- ✅ **Payouts are guaranteed** when treasury is healthy
- ✅ **System automatically prevents** over-exposure
- ✅ **You can see treasury health** in real-time

---

## 🎮 **How Parlay Betting Works**

### **Step 1: Place Your Bet**
```
Select 2+ matches → Choose stake → Confirm transaction
```
- **Minimum**: 2 match selections required
- **Multiplier**: 1.8x base + 0.5x per additional selection
- **Validation**: System checks if treasury can cover potential payout

### **Step 2: Your Funds Are Secured**
```
APES tokens → Treasury wallet (tracked separately)
2.5% burned → Reduces total APES supply
Your bet → Recorded with full audit trail
```

### **Step 3: Matches Play Out**
```
Match resolves → System checks your selections
All correct → You win! Payout calculated
Any wrong → Better luck next time (funds go to treasury)
```

### **Step 4: Automatic Payouts**
```
Win detected → Payout amount calculated (minus 1.5% burn)
Transaction → APES sent to your wallet
Confirmation → Receipt and transaction hash provided
```

---

## 🛡️ **Risk Management & Protection**

### **How We Protect the Treasury**
1. **Exposure Limits**: Maximum 90% of treasury can be at risk
2. **Bet Size Limits**: No single bet can exceed 10% of treasury
3. **Real-time Monitoring**: Balance checked every 5 minutes
4. **Emergency Controls**: Admin can pause betting if needed

### **What Happens in Edge Cases**

#### **🚨 High Exposure Scenario**
```
If exposure > 90% of treasury:
→ New bets temporarily paused
→ Existing bets continue normally
→ System waits for treasury to replenish
→ Betting resumes when safe
```

#### **💧 Low Treasury Scenario**
```
If treasury < 100k APES:
→ Warning alerts triggered
→ Bet limits may be reduced
→ Focus on rebuilding treasury
→ All existing payouts honored
```

#### **🏆 Big Win Scenario**
```
If someone wins a huge parlay:
→ Automated payout processing
→ Treasury exposure reduced
→ System adjusts future bet limits
→ Transparent record of payout
```

---

## 📊 **Transparency & Audit Trail**

### **What You Can Track**
- ✅ **Your bet history**: All bets with timestamps and outcomes
- ✅ **Payout records**: Transaction hashes for all payments
- ✅ **Treasury health**: Real-time exposure and balance info
- ✅ **System events**: Risk alerts and administrative actions

### **Public Information**
```
GET /api/parlay-tournaments/risk-status
{
  "treasuryStatus": "healthy",
  "exposureRatio": "23.5%",
  "riskLevel": "LOW",
  "bettingPaused": false
}
```

---

## 🔮 **Smart Contract Migration (Phase 2)**

### **Current System vs Future**

| **Aspect** | **Current (Phase 1)** | **Future (Phase 2)** |
|------------|------------------------|----------------------|
| **Fund Storage** | Treasury wallet | Smart contract escrow |
| **Payouts** | Admin-triggered | Fully automated |
| **Security** | Monitored + Controls | Trustless + Automated |
| **Transparency** | Database + API | On-chain + Immutable |

### **Migration Benefits**
- 🚀 **Zero human intervention** required
- 🔐 **Mathematically guaranteed** payouts
- 📱 **Instant resolution** when matches end
- 🌐 **Fully decentralized** operation

---

## ❓ **Frequently Asked Questions**

### **Q: How do I know my funds are safe?**
A: Multiple layers protect you:
1. Real-time treasury monitoring prevents over-exposure
2. Professional risk management with automated controls  
3. Full audit trail of all transactions
4. Emergency pause capabilities for extreme scenarios

### **Q: What happens if I win a big parlay?**
A: Automated systems handle payouts:
1. Win is detected automatically when matches resolve
2. Payout amount calculated (your stake × multiplier - 1.5% burn)
3. APES tokens transferred to your wallet
4. Transaction hash provided for verification

### **Q: Can the platform steal my funds?**
A: Current protections:
- Admin actions are logged and auditable
- Treasury balance is publicly monitorable
- Risk controls prevent dangerous over-exposure
- Smart contract migration will eliminate human control entirely

### **Q: What if the treasury runs out of money?**
A: This is prevented by design:
- System monitors exposure in real-time
- Betting paused before dangerous levels
- Treasury replenishes from losing bets
- Emergency controls protect against edge cases

### **Q: How are burns calculated?**
A: Two burn events:
- **2.5% on bet placement**: Burned immediately from your stake
- **1.5% on payout**: Burned from your winnings
- **Purpose**: Reduces APES supply, making remaining tokens more valuable

---

## 🚀 **Getting Started**

### **Ready to Play?**
1. **Connect your wallet** with APES tokens
2. **Check treasury health** (should show "healthy" status)
3. **Select 2+ matches** for your parlay
4. **Confirm your stake** and submit
5. **Track your bet** in the "My Bets" section
6. **Receive automatic payouts** when you win!

### **Need Help?**
- 📊 **Check system status**: Risk status endpoint shows current health
- 💬 **Community support**: Ask questions in our Discord/Telegram
- 📖 **Technical docs**: Full API documentation available
- 🛠️ **Admin support**: Contact team for urgent issues

---

**🎯 Remember**: The APES platform is designed with your security in mind. Every bet is protected by multiple layers of risk management, real-time monitoring, and professional oversight. When we migrate to smart contracts, these protections will become even stronger with mathematical guarantees and zero human intervention required.**