# Market Participants Analysis for 4Wv18rXf3Dks5fXvBJakNWpGXsLVYknA8KkTj3nnuEEr

## Market Information Found

- **Market Address**: 4Wv18rXf3Dks5fXvBJakNWpGXsLVYknA8KkTj3nnuEEr
- **Program Owner**: APESCaeLW5RuxNnpNARtDZnSgeVFC5f37Z3VFNKupJUS (APES Program)
- **Account Status**: Active on Solana blockchain
- **Account Size**: 691 bytes
- **Lamports**: 5,700,240 (≈ 0.0057 SOL)

## Challenges

1. **Database Access**: Local database connection requires proper credentials
2. **RPC Limitations**: Default Solana RPC endpoint blocks `getProgramAccounts` calls
3. **Data Sources**: Need to use either:
   - Premium RPC endpoint (Helius, QuickNode, etc.)
   - Direct database access with proper credentials
   - API endpoints if the backend server is running

## Alternative Approaches to Find Participants

### Option 1: Use the API Endpoint (if server is running)
```bash
curl -X GET "http://localhost:4000/api/markets/4Wv18rXf3Dks5fXvBJakNWpGXsLVYknA8KkTj3nnuEEr/participants"
```

### Option 2: Use a Premium RPC Endpoint
You can modify the script to use a premium RPC endpoint like:
- Helius: https://rpc.helius.xyz/?api-key=YOUR_KEY
- QuickNode: Your QuickNode endpoint
- Alchemy: Your Alchemy endpoint

### Option 3: Check via Solana Explorer
Visit: https://explorer.solana.com/address/4Wv18rXf3Dks5fXvBJakNWpGXsLVYknA8KkTj3nnuEEr

### Option 4: Use the APES Platform UI
If the market is listed on the APES platform, you might be able to see participant information there.

## What We Need to Find

1. **Total number of unique participants**
2. **List of all wallet addresses that participated**
3. **For each participant:**
   - Which option they bet on
   - Amount bet
   - Whether they've claimed rewards (if they won)
   - Timestamp of their prediction

4. **Pending claims specifically:**
   - Wallets that bet on the winning option
   - Have not yet claimed their rewards
   - Amount they're eligible to claim

## Next Steps

To properly analyze this market's participants, you'll need:

1. **For database access**: Set up proper environment variables for database connection
2. **For blockchain access**: Use a premium RPC endpoint that allows `getProgramAccounts`
3. **For API access**: Ensure the backend server is running

Would you like me to:
- Create a script that uses a premium RPC endpoint (if you have one)?
- Help set up the database connection properly?
- Create a script that checks individual prediction PDAs if you have specific wallet addresses? 