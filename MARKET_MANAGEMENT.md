# Market Management & Access Control

## Overview

The platform implements strict access control for market creation and resolution. Only authorized wallets (deployer/treasury wallets) can:
- Create new markets
- Resolve markets
- Access the admin dashboard

## Configuration

### Environment Variables

Create a `.env` file in `src/frontend/` with the following:

```env
# Solana Network Configuration
VITE_SOLANA_NETWORK=devnet

# Authorized Wallets (comma-separated list)
# For devnet testing:
VITE_AUTHORIZED_WALLETS=4FxpxY3RRN4GQnSTTdZe2MEpRQCdTVnV3mX9Yf46vKoS

# For mainnet production:
# VITE_AUTHORIZED_WALLETS=APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z,APESxbwPNyJW62vSY83zENJwoL2gXJ8HbpMBPWwJKGi2
```

### Default Authorized Wallets

If no environment variable is set, the system defaults to:
- **Devnet**: `4FxpxY3RRN4GQnSTTdZe2MEpRQCdTVnV3mX9Yf46vKoS`

## Features

### 1. Create Market (`/create-market`)
- Only accessible by authorized wallets
- Requires market service initialization
- Shows unauthorized message for non-authorized wallets
- Market creation includes:
  - Question and options
  - Resolution date
  - Creator stake (minimum 100 APES)
  - Category selection
  - Creator fee rate

### 2. Admin Dashboard (`/admin`)
- Only visible in navigation for authorized wallets
- Shows all markets with filtering options
- Allows market resolution
- Features:
  - Filter by status (All/Active/Resolved)
  - Real-time market statistics
  - One-click resolution
  - Direct link to create new markets

### 3. Market Resolution
- Only authorized wallets can resolve markets
- Resolution process:
  - Select winning option
  - Transaction confirmed on-chain
  - Market status updated to "Resolved"
  - Winners can claim rewards

## Security Implementation

### Access Control Flow

1. **Wallet Connection**
   - User connects wallet
   - System checks if wallet address is in authorized list
   - Sets authorization state

2. **Market Service Initialization**
   - Service initialized with wallet adapter
   - Required for all market operations
   - Handles transaction signing

3. **UI Protection**
   - Unauthorized wallets see clear error messages
   - Admin links hidden from navigation
   - Redirect to markets page

### Code Structure

```javascript
// Check authorization
import { isWalletAuthorized } from '../config/access';

const isAuthorized = isWalletAuthorized(publicKey.toString());
```

## Testing

### Devnet Testing
1. Use the default devnet deployer wallet
2. Or set `VITE_AUTHORIZED_WALLETS` in `.env`
3. Connect authorized wallet
4. Access `/create-market` and `/admin`

### Adding New Authorized Wallets
1. Update `.env` file with comma-separated addresses
2. Restart the development server
3. New wallets will have access immediately

## Error Messages

### Unauthorized Access
```
Your wallet [address] is not authorized to create markets.
Only deployer and treasury wallets can create and resolve markets.
```

### Service Not Initialized
```
Market service not initialized. Please try reconnecting your wallet.
```

## Best Practices

1. **Environment Variables**
   - Never commit `.env` files
   - Use `.env.example` as template
   - Different wallets for dev/prod

2. **Access Control**
   - Regularly review authorized wallets
   - Remove old/compromised wallets
   - Log access attempts (future feature)

3. **Market Resolution**
   - Double-check winning option
   - Resolution is irreversible
   - Affects user rewards

## Future Enhancements

1. **Role-Based Access**
   - Different permission levels
   - Moderator vs Admin roles
   - Time-based access

2. **Audit Trail**
   - Log all admin actions
   - Track resolution history
   - Monitor access attempts

3. **Multi-Sig Support**
   - Require multiple approvals
   - Safer market resolution
   - Treasury protection 