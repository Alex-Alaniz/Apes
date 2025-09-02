// Admin authentication middleware
const authenticateAdmin = (req, res, next) => {
  try {
    const walletAddress = req.headers['x-wallet-address'];
    
    if (!walletAddress) {
      return res.status(401).json({ 
        error: 'No wallet address provided',
        code: 'NO_WALLET'
      });
    }
    
    // Get admin wallets from environment
    const adminWallets = process.env.ADMIN_WALLETS;
    
    if (!adminWallets) {
      console.error('⚠️ ADMIN_WALLETS environment variable not set');
      return res.status(503).json({ 
        error: 'Admin system not configured',
        code: 'ADMIN_NOT_CONFIGURED'
      });
    }
    
    // Parse admin wallets
    const authorizedWallets = adminWallets.split(',').map(w => w.trim()).filter(Boolean);
    
    if (authorizedWallets.length === 0) {
      console.error('⚠️ No admin wallets configured');
      return res.status(503).json({ 
        error: 'Admin system not configured',
        code: 'NO_ADMIN_WALLETS'
      });
    }
    
    // Check if wallet is authorized
    if (!authorizedWallets.includes(walletAddress)) {
      console.log(`🚫 Unauthorized admin access attempt from ${walletAddress}`);
      return res.status(403).json({ 
        error: 'Unauthorized access',
        code: 'UNAUTHORIZED'
      });
    }
    
    // Log successful admin auth
    console.log(`✅ Admin authenticated: ${walletAddress}`);
    
    // Attach wallet to request
    req.adminWallet = walletAddress;
    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    res.status(500).json({ 
      error: 'Authentication error',
      code: 'AUTH_ERROR'
    });
  }
};

// Export middleware
module.exports = {
  authenticateAdmin
};