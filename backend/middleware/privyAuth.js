const { PrivyClient } = require('@privy-io/server-auth');

// Initialize Privy client
if (!process.env.PRIVY_APP_ID || !process.env.PRIVY_APP_SECRET) {
  console.error('CRITICAL: Privy credentials not configured. Set PRIVY_APP_ID and PRIVY_APP_SECRET in environment variables.');
}

const privy = process.env.PRIVY_APP_ID && process.env.PRIVY_APP_SECRET
  ? new PrivyClient(process.env.PRIVY_APP_ID, process.env.PRIVY_APP_SECRET)
  : null;

/**
 * Verify Privy authentication token
 */
async function verifyPrivyAuth(req, res, next) {
  if (!privy) {
    return res.status(503).json({ 
      error: 'Privy authentication not configured',
      code: 'PRIVY_NOT_CONFIGURED'
    });
  }
  
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Missing or invalid authorization header' 
      });
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    // Verify the auth token with Privy
    const { userId } = await privy.verifyAuthToken(token);
    
    // Get full user details from Privy
    const user = await privy.getUser(userId);
    
    // Attach user to request
    req.privyUser = user;
    req.privyUserId = userId;
    
    // Extract wallet addresses for convenience
    req.walletAddresses = {
      solana: user.linkedAccounts?.find(a => a.type === 'solana_wallet')?.address,
      polygon: user.linkedAccounts?.find(a => 
        a.type === 'wallet' && 
        (a.chainId === '0x89' || a.chainId === 'eip155:137')
      )?.address,
      ethereum: user.linkedAccounts?.find(a => 
        a.type === 'wallet' && 
        (a.chainId === '0x1' || a.chainId === 'eip155:1')
      )?.address
    };
    
    // Extract embedded wallet if exists
    const embeddedWallet = user.linkedAccounts?.find(a => 
      a.type === 'wallet' && 
      a.walletClient === 'privy'
    );
    
    if (embeddedWallet) {
      req.hasEmbeddedWallet = true;
      req.embeddedWalletAddress = embeddedWallet.address;
    }
    
    next();
  } catch (error) {
    console.error('Privy auth error:', error);
    
    if (error.message?.includes('expired')) {
      return res.status(401).json({ 
        error: 'Token expired',
        code: 'TOKEN_EXPIRED' 
      });
    }
    
    return res.status(401).json({ 
      error: 'Invalid authentication token',
      code: 'INVALID_TOKEN'
    });
  }
}

/**
 * Optional auth - doesn't fail if no token
 */
async function optionalPrivyAuth(req, res, next) {
  if (!privy) {
    req.privyUser = null;
    return next();
  }
  
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // No token provided, continue without auth
    req.privyUser = null;
    return next();
  }
  
  // If token provided, verify it
  return verifyPrivyAuth(req, res, next);
}

/**
 * Require specific wallet type
 */
function requireWallet(chainType) {
  return (req, res, next) => {
    if (!req.walletAddresses || !req.walletAddresses[chainType]) {
      return res.status(403).json({
        error: `${chainType} wallet required`,
        code: 'WALLET_REQUIRED',
        chainType
      });
    }
    next();
  };
}

/**
 * Link Privy user to existing database user
 */
async function linkPrivyToExistingUser(privyUserId, walletAddress) {
  const db = require('../config/database');
  
  try {
    // Update existing user with Privy ID
    const result = await db.query(
      `UPDATE users 
       SET privy_user_id = $1, 
           updated_at = CURRENT_TIMESTAMP 
       WHERE wallet_address = $2 
       RETURNING *`,
      [privyUserId, walletAddress]
    );
    
    if (result.rows.length > 0) {
      return result.rows[0];
    }
    
    // If no existing user, create new one
    const newUser = await db.query(
      `INSERT INTO users (wallet_address, privy_user_id, created_at, updated_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [walletAddress, privyUserId]
    );
    
    return newUser.rows[0];
  } catch (error) {
    console.error('Error linking Privy user:', error);
    throw error;
  }
}

/**
 * Get or create user from Privy auth
 */
async function getOrCreateUserFromPrivy(req, res, next) {
  if (!req.privyUser) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  try {
    const db = require('../config/database');
    
    // Try to find user by Privy ID first
    let user = await db.query(
      'SELECT * FROM users WHERE privy_user_id = $1',
      [req.privyUserId]
    );
    
    if (user.rows.length === 0) {
      // Try to find by wallet address (for migration)
      const walletAddress = req.walletAddresses.solana || req.walletAddresses.polygon;
      
      if (walletAddress) {
        user = await db.query(
          'SELECT * FROM users WHERE wallet_address = $1',
          [walletAddress]
        );
        
        if (user.rows.length > 0) {
          // Link existing user to Privy
          await linkPrivyToExistingUser(req.privyUserId, walletAddress);
          user = await db.query(
            'SELECT * FROM users WHERE privy_user_id = $1',
            [req.privyUserId]
          );
        }
      }
    }
    
    // If still no user, create new one
    if (user.rows.length === 0) {
      const walletAddress = req.walletAddresses.solana || req.walletAddresses.polygon || req.embeddedWalletAddress;
      const email = req.privyUser.email?.address;
      const twitter = req.privyUser.twitter?.username;
      
      user = await db.query(
        `INSERT INTO users (
          privy_user_id, 
          wallet_address, 
          email, 
          twitter_username,
          polygon_address,
          created_at, 
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *`,
        [
          req.privyUserId, 
          walletAddress, 
          email, 
          twitter,
          req.walletAddresses.polygon
        ]
      );
    }
    
    req.user = user.rows[0];
    next();
  } catch (error) {
    console.error('Error getting/creating user:', error);
    res.status(500).json({ error: 'Failed to process user' });
  }
}

module.exports = {
  verifyPrivyAuth,
  optionalPrivyAuth,
  requireWallet,
  linkPrivyToExistingUser,
  getOrCreateUserFromPrivy,
  privyClient: privy
};