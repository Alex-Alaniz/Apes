# Railway Admin Setup

To fix the admin authorization on Railway production:

## Set Railway Environment Variable

Add this environment variable in your Railway dashboard:

```
ADMIN_WALLETS=APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z,5eC9qH2vZQki2FKLmJR2WCsDw8MxzomyJDyfzoNHM2kE
```

## Or use Railway CLI

If you have Railway CLI installed:

```bash
railway variables set ADMIN_WALLETS="APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z,5eC9qH2vZQki2FKLmJR2WCsDw8MxzomyJDyfzoNHM2kE"
```

This will add both admin wallets:
- Treasury wallet: `APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z`
- Your wallet: `5eC9qH2vZQki2FKLmJR2WCsDw8MxzomyJDyfzoNHM2kE`

After setting this, redeploy the Railway service and the admin authorization will work on production.