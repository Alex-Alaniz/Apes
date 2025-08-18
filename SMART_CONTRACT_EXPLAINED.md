# 🧠 Smart Contract System - Technical Deep Dive

## 🎯 Understanding the APES Parlay Smart Contract

Our Solana-based smart contract provides **trustless, automated parlay betting** with built-in risk management and treasury protection.

---

## 📋 **Contract Architecture Overview**

### **Core Program: `CS2ParlayBettingSystemV1`**
```rust
// Main program ID (will be deployed)
declare_id!("CS2ParlayBettingSystemV1");
```

### **Key Account Structures**

#### **1. ParlayState (Global System State)**
```rust
pub struct ParlayState {
    pub authority: Pubkey,           // Admin authority
    pub treasury: Pubkey,            // Treasury wallet address
    pub burn_percentage_bet: u16,    // 250 = 2.5%
    pub burn_percentage_claim: u16,  // 150 = 1.5%
    pub total_volume: u64,           // Lifetime volume
    pub total_payouts: u64,          // Lifetime payouts
    pub active_liability: u64,       // Current exposure
    pub emergency_paused: bool,      // Emergency pause flag
}
```

#### **2. Tournament (Individual Tournament Config)**
```rust
pub struct Tournament {
    pub tournament_id: String,       // "cs2-ewc-2025"
    pub name: String,               // "CS2 Esports World Cup 2025"
    pub base_multiplier: u64,       // 1800 = 1.8x (scaled by 1000)
    pub multiplier_increment: u64,  // 500 = 0.5x
    pub min_selections: u8,         // Minimum 2 selections
    pub max_exposure: u64,          // Maximum APES exposure
    pub total_volume: u64,          // Tournament volume
    pub active_liability: u64,      // Current tournament liability
    pub status: TournamentStatus,   // Active/Paused/Completed
}
```

#### **3. ParlayBet (Individual Bet)**
```rust
pub struct ParlayBet {
    pub bet_id: String,             // Unique bet identifier
    pub user: Pubkey,              // Bettor's wallet
    pub tournament: Pubkey,        // Tournament account
    pub selections: Vec<Selection>, // Match selections
    pub amount: u64,               // Bet amount (lamports)
    pub potential_payout: u64,     // Calculated payout
    pub multiplier: u64,           // Applied multiplier
    pub status: BetStatus,         // Active/Won/Lost
    pub placed_at: i64,            // Unix timestamp
}
```

---

## ⚙️ **Core Functions Explained**

### **1. System Initialization**
```rust
pub fn initialize_parlay_system(
    ctx: Context<InitializeParlaySystem>,
    authority: Pubkey,              // Admin wallet
    treasury: Pubkey,               // Treasury wallet
    burn_percentage_bet: u16,       // 2.5% = 250
    burn_percentage_claim: u16,     // 1.5% = 150
) -> Result<()>
```

**What it does:**
- Creates the global system state
- Sets admin authority and treasury
- Configures burn percentages
- Initializes volume and liability tracking

### **2. Tournament Creation**
```rust
pub fn create_tournament(
    ctx: Context<CreateTournament>,
    tournament_id: String,          // "cs2-ewc-2025"
    name: String,                   // Display name
    base_multiplier: u64,           // 1800 = 1.8x
    multiplier_increment: u64,      // 500 = 0.5x per selection
    min_selections: u8,             // Usually 2
    max_exposure: u64,              // Risk limit in APES
) -> Result<()>
```

**What it does:**
- Creates tournament with specific parameters
- Sets exposure limits for risk management
- Configures multiplier calculation rules
- Only admin can create tournaments

### **3. Placing Bets (The Heart of the System)**
```rust
pub fn place_parlay_bet(
    ctx: Context<PlaceParlayBet>,
    bet_id: String,                 // Unique identifier
    selections: Vec<Selection>,     // User's match picks
    amount: u64,                    // Bet amount in lamports
) -> Result<()>
```

**Step-by-step process:**

#### **Step 1: Validation**
```rust
// Check minimum selections
require!(selections.len() >= tournament.min_selections, InsufficientSelections);

// Calculate potential payout
let multiplier = base_multiplier + (increment * (selections.len() - 1));
let potential_payout = (amount * multiplier) / 1000;
```

#### **Step 2: Risk Control**
```rust
// Check exposure limits
require!(
    tournament.active_liability + potential_payout <= tournament.max_exposure,
    ExposureLimitExceeded
);
```

#### **Step 3: Fund Transfer & Burn**
```rust
// Calculate burn (2.5% of bet)
let burn_amount = (amount * burn_percentage_bet) / 10000;
let escrow_amount = amount - burn_amount;

// Transfer to escrow
token::transfer(escrow_cpi_ctx, escrow_amount)?;

// Burn tokens
token::transfer(burn_cpi_ctx, burn_amount)?;
```

#### **Step 4: Record Bet**
```rust
// Store bet information
parlay_bet.bet_id = bet_id;
parlay_bet.user = user.key();
parlay_bet.amount = amount;
parlay_bet.potential_payout = potential_payout;
parlay_bet.status = BetStatus::Active;

// Update statistics
tournament.active_liability += potential_payout;
```

### **4. Bet Resolution**
```rust
pub fn resolve_parlay_bet(
    ctx: Context<ResolveParlayBet>,
    won: bool,                      // Did the user win?
) -> Result<()>
```

**If Won:**
```rust
// Calculate claim burn (1.5% of payout)
let burn_amount = (potential_payout * burn_percentage_claim) / 10000;
let payout_amount = potential_payout - burn_amount;

// Transfer payout to user
token::transfer(payout_cpi_ctx, payout_amount)?;

// Burn claim fee
token::transfer(burn_cpi_ctx, burn_amount)?;
```

**If Lost:**
```rust
// Transfer escrow to treasury (house keeps the bet)
token::transfer(treasury_cpi_ctx, escrow_amount)?;
```

---

## 🔐 **Security Features**

### **1. PDA-Based Escrow**
```rust
// Each bet gets its own escrow account
seeds = [b"parlay_bet", bet_id.as_bytes(), user.key().as_ref()]
```
- **Unique per bet**: No mixing of funds
- **Programmatic control**: Only smart contract can move funds
- **User-specific**: Each bettor has separate escrow

### **2. Authority Controls**
```rust
// Only admin can resolve bets
constraint = parlay_state.authority == authority.key()

// Only admin can pause system
constraint = parlay_state.authority == authority.key()
```

### **3. Mathematical Limits**
```rust
// Exposure cannot exceed tournament limit
require!(
    active_liability + potential_payout <= max_exposure,
    ExposureLimitExceeded
);

// Reasonable selection limits
require!(selections.len() <= 10, TooManySelections);
```

---

## 🔄 **Token Flow Diagrams**

### **Bet Placement Flow**
```
User Wallet (1000 APES)
    ↓ [transfer 1000 APES]
Split into:
    ├─ Escrow Account (975 APES) ← Held for potential payout
    └─ Burn Address (25 APES)     ← 2.5% permanently burned
```

### **Winning Bet Flow**
```
Escrow Account (975 APES) + Treasury Funds
    ↓ [calculate: 975 × 2.3x = 2242.5 APES payout]
Split into:
    ├─ User Wallet (2208.8 APES)  ← 98.5% of calculated payout
    └─ Burn Address (33.7 APES)   ← 1.5% of payout burned
```

### **Losing Bet Flow**
```
Escrow Account (975 APES)
    ↓ [bet lost]
Treasury Wallet (975 APES) ← House keeps the escrowed amount
```

---

## 📊 **Risk Management Logic**

### **Exposure Calculation**
```rust
// Total liability = sum of all potential payouts
let total_exposure = active_bets
    .iter()
    .map(|bet| bet.potential_payout)
    .sum();

// Check against limit
if total_exposure + new_payout > max_exposure {
    return Err(ExposureLimitExceeded);
}
```

### **Dynamic Multipliers**
```rust
// Base: 1.8x for 2 selections
// Each additional selection adds 0.5x
let multiplier = base_multiplier + (increment * (selections - 1));

// Example:
// 2 selections: 1.8x
// 3 selections: 2.3x  
// 4 selections: 2.8x
// 5 selections: 3.3x
```

### **Emergency Controls**
```rust
// Admin can pause all betting
if parlay_state.emergency_paused {
    return Err(SystemPaused);
}

// Existing bets continue to resolve normally
// New bets are rejected until unpaused
```

---

## 🚀 **Deployment Process**

### **1. Build the Contract**
```bash
cd src/smart_contracts/parlay_system
anchor build
```

### **2. Deploy to Devnet (Testing)**
```bash
anchor deploy --provider.cluster devnet
```

### **3. Initialize System**
```bash
# Call initialize_parlay_system with:
# - Authority: Admin wallet
# - Treasury: Treasury wallet  
# - Burn rates: 250 (2.5%), 150 (1.5%)
```

### **4. Create Tournament**
```bash
# Call create_tournament with:
# - Tournament ID: "cs2-ewc-2025"
# - Base multiplier: 1800 (1.8x)
# - Increment: 500 (0.5x)
# - Max exposure: Based on treasury size
```

### **5. Deploy to Mainnet**
```bash
anchor deploy --provider.cluster mainnet
```

---

## 🧪 **Testing Strategy**

### **Unit Tests**
```rust
#[cfg(test)]
mod tests {
    #[test]
    fn test_multiplier_calculation() {
        // Test 2-10 selections
        // Verify 1.8x base + 0.5x increment
    }
    
    #[test]
    fn test_exposure_limits() {
        // Test bet rejection at limits
        // Verify liability tracking
    }
    
    #[test]
    fn test_burn_calculations() {
        // Test 2.5% and 1.5% burns
        // Verify precision
    }
}
```

### **Integration Tests**
```typescript
// Test full bet lifecycle
describe("Parlay Betting", () => {
  it("should place bet with escrow", async () => {
    // Place bet, verify escrow created
  });
  
  it("should resolve winning bet", async () => {
    // Resolve as win, verify payout + burn
  });
  
  it("should reject over-exposure", async () => {
    // Try to exceed limits, verify rejection
  });
});
```

---

## 🔮 **Future Enhancements**

### **Oracle Integration**
```rust
// Automated match resolution via oracle
pub fn resolve_via_oracle(
    ctx: Context<OracleResolution>,
    match_results: Vec<MatchResult>,
) -> Result<()>
```

### **Liquidity Pools**
```rust
// Community-provided liquidity
pub struct LiquidityProvider {
    pub provider: Pubkey,
    pub amount_provided: u64,
    pub share_percentage: u16,
}
```

### **Cross-Chain Support**
```rust
// Wormhole integration for multi-chain
pub fn bridge_payout(
    ctx: Context<BridgePayout>,
    target_chain: u16,
    recipient: [u8; 32],
) -> Result<()>
```

---

## 💡 **Key Advantages**

1. **🔐 Trustless**: No human can access your funds once escrowed
2. **⚡ Instant**: Payouts happen immediately upon resolution
3. **🎯 Transparent**: All logic is public and auditable
4. **🛡️ Secure**: Mathematical guarantees prevent over-exposure
5. **🔥 Deflationary**: Burns reduce APES supply with every bet
6. **📊 Scalable**: Can handle thousands of concurrent bets
7. **🌐 Decentralized**: No single point of failure

The smart contract system represents the future of parlay betting - **mathematically guaranteed, fully automated, and completely trustless**. 🚀