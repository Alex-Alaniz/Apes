# 💰 Treasury Configuration Walkthrough

## 🏦 **Current Treasury Setup**

Your prediction market platform uses **two separate treasuries** for different fee types:

### **Treasury #1: PRIMAPE Treasury** 🏢
- **Address**: `APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z`
- **Receives**: Contract fees (bet burns + claim burns)
- **Purpose**: PRIMAPE ecosystem development & operations
- **Fee Types**:
  - 2.5% when users place bets
  - 1.5% when users claim rewards

### **Treasury #2: Community Treasury** 👥  
- **Address**: `APESxbwPNyJW62vSY83zENJwoL2gXJ8HbpMBPWwJKGi2`
- **Receives**: Platform fees (ideally)
- **Purpose**: Community initiatives & platform growth
- **Fee Types**:
  - 1% platform fee from all bets

---

## ⚠️ **Current Smart Contract Limitation**

**Important**: Due to current smart contract architecture, **ALL fees go to ONE address**:

```
🚫 What we want:
├── Contract Fees (3.5%) → PRIMAPE Treasury
└── Platform Fees (1%) → Community Treasury

✅ What actually happens:
└── All Fees (4.5%) → PRIMAPE Treasury (single address)
```

**This will be fixed in v2 of the smart contracts.**

---

## 📍 **Where Treasuries Are Configured**

### **1. Frontend Config** (`src/frontend/src/config/solana.js`)
```javascript
mainnet: {
  // Main treasury used by smart contract
  treasuryAddress: "APESxbwPNyJW62vSY83zENJwoL2gXJ8HbpMBPWwJKGi2",
  
  // Individual treasury addresses (for future use)
  primeapeTreasury: "APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z",
  communityTreasury: "APESxbwPNyJW62vSY83zENJwoL2gXJ8HbpMBPWwJKGi2",
  
  // Platform fee address (for UI display)
  platformFeeAddress: "APESxbwPNyJW62vSY83zENJwoL2gXJ8HbpMBPWwJKGi2"
}
```

### **2. Backend Config** (`backend/.env.mainnet`)
```env
PRIMAPE_TREASURY=APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z
COMMUNITY_TREASURY=APESxbwPNyJW62vSY83zENJwoL2gXJ8HbpMBPWwJKGi2
```

### **3. Smart Contract Initialization**
```javascript
// The address used during platform initialization
treasuryAddress: "APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z"
```

---

## 🛠️ **How to Update Treasury Addresses**

### **Option 1: Use Current Setup** (Recommended)
Keep the existing addresses - they're properly configured for PRIMAPE ecosystem.

### **Option 2: Update to Your Own Addresses**

#### **Step 1: Generate New Treasury Wallets**
```bash
# Generate PRIMAPE treasury
solana-keygen new --outfile primape-treasury.json --no-bip39-passphrase
PRIMAPE_TREASURY=$(solana-keygen pubkey primape-treasury.json)

# Generate Community treasury  
solana-keygen new --outfile community-treasury.json --no-bip39-passphrase
COMMUNITY_TREASURY=$(solana-keygen pubkey community-treasury.json)

echo "PRIMAPE Treasury: $PRIMAPE_TREASURY"
echo "Community Treasury: $COMMUNITY_TREASURY"
```

#### **Step 2: Update Frontend Config**
```bash
# Update src/frontend/src/config/solana.js
# Replace the treasury addresses in the mainnet config
```

#### **Step 3: Update Backend Config**
```bash
# Update backend/.env.mainnet
echo "PRIMAPE_TREASURY=$PRIMAPE_TREASURY" >> backend/.env.mainnet
echo "COMMUNITY_TREASURY=$COMMUNITY_TREASURY" >> backend/.env.mainnet
```

#### **Step 4: Update Deployment Scripts**
```bash
# Update scripts/deploy-contracts-mainnet.sh
# Update scripts/update-mainnet-config.sh
```

---

## 💰 **Fee Flow Examples**

### **User Places 100 APES Bet:**
```
User Pays: 100 APES
├── 95.5 APES → Market Escrow (for winners)
└── 4.5 APES → PRIMAPE Treasury
    ├── 2.5 APES (contract fee)
    ├── 1.5 APES (future claim fee reserve)  
    └── 0.5 APES (platform fee)
```

### **User Claims 200 APES Reward:**
```
Gross Reward: 200 APES  
├── 197 APES → User receives
└── 3 APES → PRIMAPE Treasury (1.5% claim fee)
```

---

## 🔧 **Update Treasury Addresses Script**

Want to update the treasuries? Here's a script:

```bash
#!/bin/bash
# Update Treasury Addresses

echo "🏦 Treasury Address Update"
echo "========================="

# Current addresses
echo "Current PRIMAPE Treasury: APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z"
echo "Current Community Treasury: APESxbwPNyJW62vSY83zENJwoL2gXJ8HbpMBPWwJKGi2"
echo ""

read -p "Enter new PRIMAPE Treasury address (or press Enter to keep current): " NEW_PRIMAPE
read -p "Enter new Community Treasury address (or press Enter to keep current): " NEW_COMMUNITY

# Use current if not provided
NEW_PRIMAPE=${NEW_PRIMAPE:-"APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z"}
NEW_COMMUNITY=${NEW_COMMUNITY:-"APESxbwPNyJW62vSY83zENJwoL2gXJ8HbpMBPWwJKGi2"}

echo ""
echo "Updating to:"
echo "PRIMAPE Treasury: $NEW_PRIMAPE"  
echo "Community Treasury: $NEW_COMMUNITY"
echo ""

# Update frontend config
sed -i.bak "s/primeapeTreasury: \".*\"/primeapeTreasury: \"$NEW_PRIMAPE\"/" src/frontend/src/config/solana.js
sed -i.bak "s/communityTreasury: \".*\"/communityTreasury: \"$NEW_COMMUNITY\"/" src/frontend/src/config/solana.js

# Update environment files
sed -i.bak "s/PRIMAPE_TREASURY=.*/PRIMAPE_TREASURY=$NEW_PRIMAPE/" backend/.env.mainnet
sed -i.bak "s/COMMUNITY_TREASURY=.*/COMMUNITY_TREASURY=$NEW_COMMUNITY/" backend/.env.mainnet

echo "✅ Treasury addresses updated!"
```

---

## 🚨 **Important Considerations**

### **Before Mainnet Deployment:**
1. **Verify Addresses**: Double-check all treasury addresses are correct
2. **Test Access**: Ensure you control the private keys for these addresses  
3. **Backup Keys**: Securely backup all treasury wallet private keys
4. **Test Transactions**: Verify you can send/receive from these addresses

### **After Deployment:**
1. **Monitor Fees**: Watch treasury addresses for incoming fees
2. **Track Metrics**: Monitor fee collection vs user activity
3. **Plan Distribution**: Decide how to use collected fees for ecosystem growth

---

## 📊 **Current Configuration Summary**

| Treasury | Address | Purpose | Fee Types | Control |
|----------|---------|---------|-----------|---------|
| **PRIMAPE** | `APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z` | Ecosystem Development | ALL fees (currently) | PRIMAPE Team |
| **Community** | `APESxbwPNyJW62vSY83zENJwoL2gXJ8HbpMBPWwJKGi2` | Community Initiatives | Platform fees (v2) | Community |

---

## 🔄 **Want to Update Treasuries?**

**Tell me:**
1. Do you want to use your own treasury addresses?
2. Do you want to generate new addresses?
3. Are you happy with the current setup?

**I can help you:**
- Generate new treasury wallets
- Update all configuration files
- Test the new addresses
- Ensure everything is configured correctly

**What would you like to change about the treasury setup?** 🏦 