const { PublicKey } = require('@solana/web3.js');
const nacl = require('tweetnacl');
const bs58 = require('bs58');

// Extract timestamp from message (if included)
const extractTimestampFromMessage = (message) => {
  // Expected format: "Authenticate PRIMAPE at {timestamp}"
  const match = message.match(/at (\d+)$/);
  return match ? parseInt(match[1]) : null;
};

// Wallet address validation
const isValidSolanaAddress = (address) => {
  try {
    // Solana addresses are base58 encoded and typically 32-44 characters
    if (!address || typeof address !== 'string') return false;
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) return false;
    
    // Try to decode to verify it's valid base58
    const decoded = bs58.decode(address);
    return decoded.length === 32;
  } catch (error) {
    return false;
  }
};

// Validate referral code format (for legacy support if needed)
const isValidReferralCode = (code) => {
  // Since we're using wallet addresses, validate as such
  return isValidSolanaAddress(code);
};

// Authentication middleware - verify wallet ownership
const authenticateWallet = async (req, res, next) => {
  try {
    const walletAddress = req.headers['x-wallet-address'];
    const signature = req.headers['x-wallet-signature'];
    const message = req.headers['x-signature-message'];
    
    if (!walletAddress || !signature || !message) {
      return res.status(401).json({ 
        error: 'Missing authentication headers',
        required: ['x-wallet-address', 'x-wallet-signature', 'x-signature-message']
      });
    }
    
    // Validate wallet address format
    if (!isValidSolanaAddress(walletAddress)) {
      return res.status(400).json({ error: 'Invalid wallet address format' });
    }
    
    // Verify the signature
    try {
      // Convert wallet address to PublicKey
      const publicKey = new PublicKey(walletAddress);
      
      // Decode the signature from base58
      let signatureBytes;
      try {
        signatureBytes = bs58.decode(signature);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid signature format' });
      }
      
      // Convert message to bytes
      const messageBytes = new TextEncoder().encode(message);
      
      // Verify the signature using nacl (tweetnacl)
      const isValid = nacl.sign.detached.verify(
        messageBytes,
        signatureBytes,
        publicKey.toBytes()
      );
      
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid signature' });
      }
      
      // Check message expiry (optional but recommended)
      // Messages should include a timestamp to prevent replay attacks
      const messageTimestamp = extractTimestampFromMessage(message);
      if (messageTimestamp) {
        const messageAge = Date.now() - messageTimestamp;
        const MAX_MESSAGE_AGE = 5 * 60 * 1000; // 5 minutes
        
        if (messageAge > MAX_MESSAGE_AGE) {
          return res.status(401).json({ error: 'Signature expired' });
        }
      }
      
      req.wallet = walletAddress;
      req.authenticated = true;
      next();
    } catch (error) {
      console.error('Signature verification error:', error);
      return res.status(401).json({ error: 'Invalid signature' });
    }
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
};

// Middleware to check if user can access specific wallet data
const authorizeWalletAccess = (req, res, next) => {
  const requestedWallet = req.params.walletAddress;
  const authenticatedWallet = req.wallet;
  
  if (!authenticatedWallet) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  // Users can only access their own data
  if (requestedWallet !== authenticatedWallet) {
    return res.status(403).json({ 
      error: 'Forbidden', 
      message: 'You can only access your own referral data' 
    });
  }
  
  next();
};

// Rate limiting specific to referral operations
const referralRateLimiter = require('express-rate-limit');

const createReferralLimiter = referralRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Max 5 referral creations per window
  message: 'Too many referral attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

const statsReferralLimiter = referralRateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Max 30 stats requests per minute
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Input sanitization middleware
const sanitizeReferralInput = (req, res, next) => {
  // Sanitize body inputs
  if (req.body) {
    // Remove any HTML/script tags
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        req.body[key] = req.body[key].replace(/<[^>]+>/g, '');
      }
    });
    
    // Validate specific fields
    if (req.body.referralCode && !isValidSolanaAddress(req.body.referralCode)) {
      return res.status(400).json({ error: 'Invalid referral wallet address' });
    }
    
    if (req.body.referredWallet && !isValidSolanaAddress(req.body.referredWallet)) {
      return res.status(400).json({ error: 'Invalid referred wallet address' });
    }
    
    if (req.body.sourcePlatform && !['ios', 'web'].includes(req.body.sourcePlatform)) {
      req.body.sourcePlatform = 'web'; // Default to web if invalid
    }
  }
  
  next();
};

module.exports = {
  authenticateWallet,
  authorizeWalletAccess,
  createReferralLimiter,
  statsReferralLimiter,
  sanitizeReferralInput,
  isValidSolanaAddress,
  isValidReferralCode
};