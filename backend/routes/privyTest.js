const express = require('express');
const router = express.Router();
const { 
  verifyPrivyAuth, 
  optionalPrivyAuth,
  requireWallet,
  getOrCreateUserFromPrivy 
} = require('../middleware/privyAuth');

/**
 * Test endpoint - no auth required
 */
router.get('/test', (req, res) => {
  res.json({
    message: 'Privy test endpoint working',
    timestamp: new Date().toISOString()
  });
});

/**
 * Get current user info
 */
router.get('/me', verifyPrivyAuth, (req, res) => {
  res.json({
    privyUserId: req.privyUserId,
    email: req.privyUser.email?.address,
    twitter: req.privyUser.twitter?.username,
    google: req.privyUser.google?.email,
    wallets: req.walletAddresses,
    hasEmbeddedWallet: req.hasEmbeddedWallet,
    linkedAccounts: req.privyUser.linkedAccounts?.map(account => ({
      type: account.type,
      address: account.address,
      chainId: account.chainId,
      walletClient: account.walletClient,
      connectorType: account.connectorType
    }))
  });
});

/**
 * Test wallet requirements
 */
router.get('/solana-only', verifyPrivyAuth, requireWallet('solana'), (req, res) => {
  res.json({
    message: 'Solana wallet verified',
    solanaAddress: req.walletAddresses.solana
  });
});

router.get('/polygon-only', verifyPrivyAuth, requireWallet('polygon'), (req, res) => {
  res.json({
    message: 'Polygon wallet verified',
    polygonAddress: req.walletAddresses.polygon
  });
});

/**
 * Test user creation/linking
 */
router.post('/link-user', verifyPrivyAuth, getOrCreateUserFromPrivy, (req, res) => {
  res.json({
    message: 'User linked successfully',
    user: {
      id: req.user.id,
      privyUserId: req.user.privy_user_id,
      walletAddress: req.user.wallet_address,
      polygonAddress: req.user.polygon_address,
      createdAt: req.user.created_at
    }
  });
});

/**
 * Optional auth test
 */
router.get('/optional', optionalPrivyAuth, (req, res) => {
  if (req.privyUser) {
    res.json({
      authenticated: true,
      userId: req.privyUserId,
      wallets: req.walletAddresses
    });
  } else {
    res.json({
      authenticated: false,
      message: 'No authentication provided'
    });
  }
});

/**
 * Test wallet operations
 */
router.post('/test-sign', verifyPrivyAuth, async (req, res) => {
  const { message, chainType } = req.body;
  
  if (!message || !chainType) {
    return res.status(400).json({ error: 'Message and chainType required' });
  }
  
  // In a real app, you would:
  // 1. Send the message to the frontend
  // 2. Have the user sign it with their Privy wallet
  // 3. Verify the signature on the backend
  
  res.json({
    message: 'To implement: Send to frontend for signing',
    messageToSign: message,
    chainType,
    wallet: req.walletAddresses[chainType]
  });
});

/**
 * Migration endpoint for existing users
 */
router.post('/migrate', async (req, res) => {
  const { solanaWalletAddress, privyAuthToken } = req.body;
  
  if (!solanaWalletAddress || !privyAuthToken) {
    return res.status(400).json({ 
      error: 'solanaWalletAddress and privyAuthToken required' 
    });
  }
  
  try {
    const { privyClient } = require('../middleware/privyAuth');
    const { userId } = await privyClient.verifyAuthToken(privyAuthToken);
    
    // Link the Privy user to existing Solana wallet
    const { linkPrivyToExistingUser } = require('../middleware/privyAuth');
    const user = await linkPrivyToExistingUser(userId, solanaWalletAddress);
    
    res.json({
      success: true,
      message: 'User migrated successfully',
      userId: user.id
    });
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({ error: 'Migration failed' });
  }
});

module.exports = router;