# Admin Market Deployment Interface

## Overview

We've created an admin interface that allows you to preview and approve markets from the Polymarket database before deploying them to Solana. This interface uses wallet-based authentication, consistent with the existing admin panel.

## Features

### 1. Market Preview
- View all pending markets from Polymarket database
- See full market details including:
  - Question text
  - Category (sports, crypto, politics, etc.)
  - Options with icons
  - Time remaining until market ends
  - Banner images
  - ApeChain and Polymarket IDs

### 2. Visual Preview Modal
- Click "Preview" on any market to see a full visual representation
- Shows how the market will appear on your platform
- Displays banner image, options with icons, and all metadata

### 3. One-Click Deployment
- Deploy markets to Solana with a single button click
- Automatic handling of all blockchain interactions
- Real-time status updates during deployment
- Success/error notifications

### 4. Filtering
- Only shows markets that are:
  - Live on ApeChain (status='live')
  - Not yet deployed to Solana
  - Still active (end_time > now)
- Automatically removes deployed markets from the list

## How to Use

### 1. Access Admin Panel
```
1. Connect your admin wallet (PRIMAPE Treasury or Community Treasury)
2. Navigate to /admin
3. Click "Deploy from Polymarket" button
```

### 2. Review Markets
- Browse the list of pending markets
- Each market shows:
  - Category badge with color coding
  - Question text
  - Options with icons
  - Time remaining
  - Preview and Deploy buttons

### 3. Preview Before Deploying
- Click "Preview" to see full market details
- Review all information carefully
- Check that images load correctly
- Verify options are correct

### 4. Deploy Market
- Click "Deploy" button
- Wait for transaction to complete (10-20 seconds)
- Market will be removed from list once deployed
- Success notification shows the market address

## Wallet Authentication

### Authorized Wallets
The following wallets have admin access:
- `APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z` - PRIMAPE Treasury
- `APESxbwPNyJW62vSY83zENJwoL2gXJ8HbpXfkBGfnghe` - Community Treasury

To add more admin wallets:
1. Update `src/frontend/src/config/access.js`
2. Update `src/backend/routes/admin.js` with the same wallets

### Security
- No passwords needed - uses wallet signature
- Only authorized wallets can access admin features
- All deployments are tracked with the deploying wallet address

## Backend API Endpoints

### Get Pending Markets
```
GET /api/admin/pending-markets
X-Wallet-Address: <admin-wallet-address>

Response: {
  markets: [...],
  total: 20
}
```

### Deploy Market
```
POST /api/admin/deploy-market/:polyId
X-Wallet-Address: <admin-wallet-address>
Body: { "skipApeChainCheck": true }

Response: {
  success: true,
  market: {
    address: "...",
    transaction: "...",
    poly_id: "...",
    question: "..."
  }
}
```

## Market Data Structure

Each market includes:
```javascript
{
  poly_id: "event-16174",
  apechain_market_id: "50",
  question: "Will Bitcoin reach $100k by end of 2025?",
  category: "crypto",
  options: [
    { label: "Yes", icon: "https://..." },
    { label: "No", icon: "https://..." }
  ],
  assets: {
    banner: "https://...",
    icon: "https://..."
  },
  end_time: "2025-12-31T17:00:00.000Z",
  market_type: "binary",
  status: "live"
}
```

## Category Color Coding

Markets are color-coded by category:
- 🟦 **Sports** - Blue
- 🟪 **Crypto** - Purple
- 🟥 **Politics** - Red
- 🟩 **Business** - Green
- 🟨 **News** - Yellow
- 🟦 **Tech** - Indigo
- 🩷 **Culture** - Pink

## Security Features

1. **Wallet Authentication**
   - Only authorized treasury wallets can access
   - No password management needed
   - Consistent with existing admin panel

2. **Deployment Tracking**
   - Each deployment records which wallet deployed it
   - Full audit trail in database

3. **Database Validation**
   - Only shows markets with ApeChain IDs
   - Filters out already deployed markets
   - Validates all data before deployment

## Monitoring

The interface shows:
- Connected wallet address
- Total pending markets count
- Deployment status in real-time
- Success/error notifications
- Transaction hashes for verification

## Troubleshooting

### "Unauthorized Access"
- Ensure you're connected with an authorized wallet
- Check that your wallet is in the authorized list
- Try disconnecting and reconnecting your wallet

### "No Pending Markets"
- All available markets have been deployed
- Check database for new markets
- Run: `node scripts/check-deployable-markets.js`

### Deployment Fails
- Check wallet has sufficient APES tokens
- Verify Solana RPC is responsive
- Check browser console for detailed errors

### Images Not Loading
- Some markets may have broken image links
- Preview before deploying to verify
- Images are stored as metadata only

## Benefits

1. **Secure Access** - Wallet-based authentication
2. **Quality Control** - Review markets before they go live
3. **Visual Preview** - See exactly how markets will appear
4. **Efficient Workflow** - Deploy multiple markets quickly
5. **Error Prevention** - Catch issues before deployment
6. **Audit Trail** - All deployments are logged with wallet address

## Next Steps

1. Connect your admin wallet
2. Access `/admin`
3. Navigate to "Deploy from Polymarket"
4. Start deploying high-quality markets!

The system automatically fetches the latest markets from Polymarket's database and presents them in an easy-to-review interface, making market curation simple and efficient. 