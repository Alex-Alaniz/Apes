# Manual Testing Guide for Solana Prediction Market

## Prerequisites
- Solana CLI installed
- Phantom/Solflare wallet with devnet SOL
- Mock APES tokens on devnet

## Testing Steps

### 1. Check Your Setup
```bash
# Check your wallet address
solana address

# Check SOL balance
solana balance

# Check APES token balance
spl-token balance JDgVjm6Sw2tc2mg13RH15AnUUGWoRadRX4Zb69AVNGWb
```

### 2. Frontend Testing (http://localhost:3002)

#### A. Connect Wallet
1. Open http://localhost:3002
2. Click "Connect Wallet" in the top right
3. Select your wallet (Phantom/Solflare)
4. Ensure wallet is on **Devnet**

#### B. Browse Markets
1. View available markets on home page
2. Use filters to sort by:
   - Category (Crypto, Sports, Politics, etc.)
   - Status (Active, Resolved)
   - Volume

#### C. Place a Prediction
1. Click on any active market
2. Select your prediction (Yes/No)
3. Enter amount in APES tokens
4. Click "Place Prediction"
5. Approve transaction in wallet

#### D. Create a Market
1. Click "Create Market" button
2. Fill in:
   - Question
   - Options (for binary markets: Yes/No)
   - End date
   - Category
   - Creator stake (minimum 100 APES)
3. Submit and approve transaction

#### E. Monitor Your Positions
1. Go to Profile page
2. View your:
   - Active predictions
   - Claimable rewards
   - Created markets
   - Transaction history

### 3. Testing Token Burns

The platform automatically burns tokens on:
- **Placing bets**: 2.5% burn
- **Claiming rewards**: 1.5% burn
- **Creating markets**: 0.5% of stake

Monitor burns in transaction details on Solana Explorer.

### 4. Test Market Resolution (Admin Only)

If you're the market creator/admin:
1. Wait for market to expire
2. Click "Resolve Market"
3. Select winning option
4. Confirm transaction

### 5. Claim Rewards

After market resolution:
1. Go to the resolved market
2. If you won, click "Claim Reward"
3. Rewards = (your stake / winning pool) × total pool
4. Minus fees and burns

## Common Issues & Solutions

### Wallet Not Connecting
- Ensure wallet is unlocked
- Check you're on Devnet
- Refresh the page

### Transaction Failing
- Check you have enough SOL for fees (~0.001 SOL)
- Check you have enough APES tokens
- Ensure amounts meet minimum requirements

### No Markets Showing
- Markets might not be created yet
- Create your own test market
- Check network connection

## Useful Commands

```bash
# View program logs
solana logs 2Dg59cEkKzrnZGm3GCN9FyShbwdj1YQZNs8hfazPrRgk

# View transaction details
solana confirm -v <TRANSACTION_SIGNATURE>

# Check program account
solana account 2Dg59cEkKzrnZGm3GCN9FyShbwdj1YQZNs8hfazPrRgk
```

## Test Scenarios

1. **Happy Path**
   - Create market → Place bet → Resolve → Claim reward

2. **Edge Cases**
   - Try betting on expired market (should fail)
   - Try claiming twice (should fail)
   - Try resolving others' markets (should fail)

3. **Burn Verification**
   - Calculate expected burns
   - Verify in transaction logs
   - Check token balance changes

## Support

- Program ID: `2Dg59cEkKzrnZGm3GCN9FyShbwdj1YQZNs8hfazPrRgk`
- Mock APES Token: `JDgVjm6Sw2tc2mg13RH15AnUUGWoRadRX4Zb69AVNGWb`
- Network: Devnet
- Frontend: http://localhost:3002 