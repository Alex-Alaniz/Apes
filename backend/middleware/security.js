const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');

// Rate limiting configurations
const createRateLimiter = (windowMs, max, message, skipSuccessfulRequests = false) => {
  return rateLimit({
    windowMs: windowMs,
    max: max,
    message: {
      error: message,
      retryAfter: Math.ceil(windowMs / 1000),
      limit: max
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: skipSuccessfulRequests,
    handler: (req, res) => {
      console.warn('🚨 Rate limit exceeded:', {
        ip: req.ip,
        path: req.path,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      });
      
      res.status(429).json({
        error: message,
        retryAfter: Math.ceil(windowMs / 1000),
        limit: max
      });
    }
  });
};

// General API rate limiting
const generalLimiter = createRateLimiter(
  parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000, // 1 minute
  parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // 100 requests per minute
  'Too many requests from this IP, please try again later.'
);

// Strict rate limiting for admin endpoints
const adminLimiter = createRateLimiter(
  60000, // 1 minute
  20,    // 20 requests per minute
  'Too many admin requests from this IP. Admin actions are rate limited for security.',
  true   // Skip successful requests in count
);

// Very strict rate limiting for authentication endpoints
const authLimiter = createRateLimiter(
  900000, // 15 minutes
  5,      // 5 attempts per 15 minutes
  'Too many authentication attempts. Please try again in 15 minutes.'
);

// Strict rate limiting for market creation/resolution
const marketActionLimiter = createRateLimiter(
  300000, // 5 minutes
  10,     // 10 actions per 5 minutes
  'Too many market actions. Please wait before performing more market operations.'
);

// Security headers middleware
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "https://api.mainnet-beta.solana.com", "https://api.devnet.solana.com", "wss://api.mainnet-beta.solana.com", "wss://api.devnet.solana.com"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false, // Allow for Solana wallet adapters
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

// CORS configuration with security
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://apes-lake.vercel.app',
      process.env.CORS_ORIGIN
    ].filter(Boolean);

    // In development, be more permissive
    if (process.env.NODE_ENV === 'development') {
      allowedOrigins.push('http://localhost:3000', 'http://127.0.0.1:3000');
    }

    if (allowedOrigins.includes(origin) || process.env.CORS_ORIGIN === '*') {
      callback(null, true);
    } else {
      console.warn('🚨 CORS blocked request from origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'x-wallet-address',
    'X-Wallet-Address',
    'x-requested-with'
  ],
  exposedHeaders: ['x-ratelimit-limit', 'x-ratelimit-remaining', 'x-ratelimit-reset']
};

// Request logging and monitoring middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Log request details
  console.log('📥 Request:', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    walletAddress: req.headers['x-wallet-address'] || 'none',
    timestamp: new Date().toISOString()
  });

  // Track response
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - start;
    
    console.log('📤 Response:', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip
    });

    return originalSend.call(this, data);
  };

  next();
};

// Wallet address validation middleware
const validateWalletAddress = (req, res, next) => {
  const walletAddress = req.headers['x-wallet-address'];
  
  if (walletAddress) {
    // Basic Solana wallet address validation
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(walletAddress)) {
      return res.status(400).json({
        error: 'Invalid wallet address format',
        provided: walletAddress.substring(0, 10) + '...'
      });
    }
  }
  
  next();
};

// Input sanitization middleware
const sanitizeInputs = (req, res, next) => {
  // Basic XSS protection for string inputs
  const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;
    return str.replace(/<script[^>]*>.*?<\/script>/gi, '')
              .replace(/<[\/\!]*?[^<>]*?>/gi, '')
              .replace(/javascript:/gi, '')
              .replace(/vbscript:/gi, '');
  };

  // Recursively sanitize object
  const sanitizeObject = (obj) => {
    if (obj === null || typeof obj !== 'object') return obj;
    
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        obj[key] = sanitizeString(obj[key]);
      } else if (typeof obj[key] === 'object') {
        obj[key] = sanitizeObject(obj[key]);
      }
    }
    return obj;
  };

  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  next();
};

// Error handling middleware for security errors
const securityErrorHandler = (err, req, res, next) => {
  console.error('🚨 Security error:', {
    error: err.message,
    path: req.path,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  // Don't expose internal error details in production
  if (process.env.NODE_ENV === 'production') {
    res.status(500).json({
      error: 'Internal security error',
      timestamp: new Date().toISOString()
    });
  } else {
    res.status(500).json({
      error: err.message,
      stack: err.stack,
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = {
  // Rate limiters
  generalLimiter,
  adminLimiter,
  authLimiter,
  marketActionLimiter,
  
  // Security middleware
  securityHeaders,
  cors: cors(corsOptions),
  requestLogger,
  validateWalletAddress,
  sanitizeInputs,
  securityErrorHandler
}; 