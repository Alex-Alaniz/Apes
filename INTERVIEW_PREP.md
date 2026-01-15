# Interview Prep: Associate Director - Lead Blockchain Engineer (Rust)

## 🎯 Executive Summary

**APES** is a production-deployed decentralized prediction market platform on Solana mainnet with:
- **2,800+ lines** of Anchor/Rust smart contract code
- **Live contracts** processing real transactions
- **Full-stack architecture** (Solana + Node.js + React)
- **Advanced features**: Parlay system, token burns, access control

---

## 🦀 Rust/Solana Technical Deep Dive

### Key Files to Reference
```
src/smart_contracts/market_system/programs/market_system/src/
├── lib.rs                          # Main program (1,730 lines)
├── security_checks.rs              # Security utilities (140 lines)
├── access_control.rs               # Admin/creator whitelist (45 lines)
└── security_fixes.rs               # Additional security (513 lines)
```

### Architecture Decisions Worth Discussing

#### 1. **PDA (Program Derived Address) Design**
```rust
// Market escrow - funds held securely per market
seeds = [b"market_escrow", market.key().as_ref()]

// Prediction tracking - unique per user/market/option
seeds = [b"prediction", market.key().as_ref(), user.key().as_ref(), &[option_index]]

// Platform state - singleton for global config
seeds = [b"platform_state"]
```

**Why this matters**: PDAs enable trustless escrow without private keys. The program authority can transfer from escrow using `invoke_signed`.

#### 2. **Fixed-Size Byte Arrays vs Strings**
```rust
pub question: [u8; 200],        // Fixed 200 bytes for question
pub question_len: u16,          // Actual length of question
```

**Why this matters**: Solana charges rent based on account size. Fixed arrays allow predictable `space` allocation at account creation, avoiding reallocation costs.

#### 3. **Safe Math Throughout**
```rust
let reward_amount_u128 = total_pool
    .checked_mul(user_amount)
    .ok_or(ErrorCode::CalculationError)?
    .checked_div(win_pool)
    .ok_or(ErrorCode::CalculationError)?;
```

**Why this matters**: Prevents overflow attacks. Using u128 intermediate values prevents overflow during proportional reward calculations.

#### 4. **Access Control Pattern**
```rust
#[account]
pub struct AccessControl {
    pub admin: Pubkey,
    pub market_creators: Vec<Pubkey>,
}

// Usage in create_market:
require!(creator == ac.admin || ac.market_creators.contains(&creator), ErrorCode::Unauthorized);
```

**Why this matters**: Separates admin (can add creators) from market creators (can create markets), following principle of least privilege.

### Security Features to Highlight

| Feature | Implementation | Purpose |
|---------|---------------|---------|
| Pool Overflow Protection | `MAX_POOL_SIZE = 1B tokens` | Prevents economic attacks |
| Escrow Balance Validation | Check before every payout | Ensures solvency |
| Division by Zero Guards | `require!(winning_pool > 0)` | Prevents undefined behavior |
| Authority Checks | `has_one = admin @ ErrorCode::Unauthorized` | Anchor constraint pattern |
| Platform Pause | `require!(!platform_state.is_paused)` | Emergency stop capability |

---

## 🏛️ Full-Stack Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         User Interface                                   │
│  React + Vite + Tailwind + Solana Wallet Adapter                        │
├─────────────────────────────────────────────────────────────────────────┤
│                           API Layer                                      │
│  Express.js + PostgreSQL + Real-time Blockchain Sync                    │
├─────────────────────────────────────────────────────────────────────────┤
│                        Smart Contracts                                   │
│  Anchor Framework + SPL Token + PDA Escrows                             │
├─────────────────────────────────────────────────────────────────────────┤
│                      Solana Blockchain                                   │
│  Mainnet: APESCaeLW5RuxNnpNARtDZnSgeVFC5f37Z3VFNKupJUS                  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Integration Points

1. **Frontend → Backend**: REST API for market metadata, user profiles, leaderboards
2. **Frontend → Solana**: Direct wallet transactions via `@solana/web3.js`
3. **Backend → Solana**: Event listening, blockchain sync, transaction verification
4. **Token Burns**: Integration with Believe.app API for token burn verification

---

## 💬 Potential Interview Questions & Answers

### Q: "Walk me through how a bet is placed on-chain"

**A**: The `place_prediction` instruction:
1. **Validates** market is active, user has sufficient balance, option index is valid
2. **Calculates fees** using safe math (burn 2.5%, platform fee configurable)
3. **Updates pool state** for the selected option
4. **Transfers tokens** to market escrow (net), burn account, and treasury
5. **Creates/updates** prediction PDA with user's position

Key insight: All state updates happen AFTER validation but BEFORE token transfers. If any transfer fails, state is rolled back.

### Q: "How do you handle reward calculation without overflow?"

**A**:
```rust
// Use u128 intermediates for the multiplication
let total_pool = market.total_pool as u128;
let user_amount = prediction.amount as u128;
let win_pool = winning_pool as u128;

// Calculate: (total_pool * user_amount) / winning_pool
let reward_amount_u128 = total_pool
    .checked_mul(user_amount)?
    .checked_div(win_pool)?;

// Safely convert back to u64
let reward_amount = u64::try_from(reward_amount_u128)?;
```

This handles pools up to ~18 quintillion tokens without overflow.

### Q: "Why use Anchor over raw Solana?"

**A**: Anchor provides:
- **Account validation macros** (`#[account]`, `#[derive(Accounts)]`)
- **Automatic (de)serialization** via Borsh
- **Built-in security constraints** (`has_one`, `constraint`)
- **IDL generation** for client SDK
- **Testing framework** with `anchor test`

Trade-off: Slightly larger program size, but massive reduction in boilerplate and security footguns.

### Q: "How would you scale this for higher throughput?"

**A**: Several approaches:
1. **State compression** for historical predictions (Metaplex cNFTs pattern)
2. **Parallel markets** - separate PDAs per market allow concurrent processing
3. **Clockwork automation** for resolution scheduling
4. **Lookup tables** for reducing transaction size
5. **Account compression** for prediction records

---

## 📊 Production Metrics

| Metric | Value |
|--------|-------|
| Contract Address | `APESCaeLW5RuxNnpNARtDZnSgeVFC5f37Z3VFNKupJUS` |
| Token Mint | `9BZJXtmfPpkHnM57gHEx5Pc9oQhLhJtr4mhCsNtttTts` |
| Network | Solana Mainnet |
| Program Size | ~2,800 lines Rust |
| Features | Markets, Parlays, Burns, Access Control |

---

## 🎤 Demo Script (if needed)

1. **Show contract on Solscan**: Search for program ID
2. **Walk through lib.rs**: Account structures, instruction handlers
3. **Highlight security**: security_checks.rs module
4. **Show frontend**: Wallet connection, market display
5. **Backend sync**: Real-time blockchain event processing

---

## 📚 Additional Resources

- `SMART_CONTRACT_EXPLAINED.md` - Detailed contract walkthrough
- `docs/security/` - Security audit documentation
- `RUNNING_THE_APP.md` - Local development setup
