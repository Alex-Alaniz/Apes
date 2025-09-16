/**
 * Centralized error handling utilities
 */

// Custom error classes
class BaseError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends BaseError {
  constructor(message, details = {}) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

class AuthenticationError extends BaseError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

class AuthorizationError extends BaseError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

class NotFoundError extends BaseError {
  constructor(resource, identifier) {
    super(`${resource} not found${identifier ? `: ${identifier}` : ''}`, 404, 'NOT_FOUND');
    this.resource = resource;
    this.identifier = identifier;
  }
}

class ConflictError extends BaseError {
  constructor(message, details = {}) {
    super(message, 409, 'CONFLICT_ERROR');
    this.details = details;
  }
}

class RateLimitError extends BaseError {
  constructor(message = 'Too many requests', retryAfter = 60) {
    super(message, 429, 'RATE_LIMIT_ERROR');
    this.retryAfter = retryAfter;
  }
}

class ExternalServiceError extends BaseError {
  constructor(service, originalError) {
    super(`External service error: ${service}`, 502, 'EXTERNAL_SERVICE_ERROR');
    this.service = service;
    this.originalError = originalError?.message || originalError;
  }
}

class BlockchainError extends BaseError {
  constructor(message, txHash = null) {
    super(message, 500, 'BLOCKCHAIN_ERROR');
    this.txHash = txHash;
  }
}

// Error handler middleware
const errorHandler = (err, req, res, next) => {
  // Log error
  console.error(`[${new Date().toISOString()}] Error:`, {
    message: err.message,
    stack: err.stack,
    code: err.code,
    statusCode: err.statusCode,
    url: req.url,
    method: req.method,
    ip: req.ip,
    user: req.user?.id || 'anonymous'
  });

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Handle different error types
  if (err instanceof BaseError) {
    return res.status(err.statusCode).json({
      error: true,
      code: err.code,
      message: err.message,
      ...(err.details && { details: err.details }),
      ...(err.retryAfter && { retryAfter: err.retryAfter }),
      ...(isDevelopment && { stack: err.stack }),
      timestamp: err.timestamp
    });
  }

  // Handle Postgres errors
  if (err.code && err.code.startsWith('23')) {
    const statusCode = err.code === '23505' ? 409 : 400;
    const message = err.code === '23505' 
      ? 'Resource already exists' 
      : 'Database constraint violation';
    
    return res.status(statusCode).json({
      error: true,
      code: 'DATABASE_ERROR',
      message: isDevelopment ? err.detail : message,
      timestamp: new Date().toISOString()
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: true,
      code: 'INVALID_TOKEN',
      message: 'Invalid authentication token',
      timestamp: new Date().toISOString()
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: true,
      code: 'TOKEN_EXPIRED',
      message: 'Authentication token has expired',
      timestamp: new Date().toISOString()
    });
  }

  // Handle validation errors from libraries
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: true,
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: err.errors,
      timestamp: new Date().toISOString()
    });
  }

  // Default error response
  res.status(err.statusCode || 500).json({
    error: true,
    code: 'INTERNAL_ERROR',
    message: isDevelopment ? err.message : 'An unexpected error occurred',
    ...(isDevelopment && { stack: err.stack }),
    timestamp: new Date().toISOString()
  });
};

// Async error wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Error logger for services
const logError = (error, context = {}) => {
  console.error(`[${new Date().toISOString()}] Service Error:`, {
    message: error.message,
    stack: error.stack,
    ...context
  });

  // In production, send to error tracking service
  if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
    // Sentry.captureException(error, { extra: context });
  }
};

// Validation helpers
const validateRequired = (fields, data) => {
  const missing = fields.filter(field => !data[field]);
  if (missing.length > 0) {
    throw new ValidationError(`Missing required fields: ${missing.join(', ')}`, { missing });
  }
};

const validateWalletAddress = (address) => {
  if (!address) {
    throw new ValidationError('Wallet address is required');
  }
  
  // Solana address validation
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) {
    throw new ValidationError('Invalid Solana wallet address');
  }
};

const validatePositiveNumber = (value, fieldName) => {
  const num = parseFloat(value);
  if (isNaN(num) || num <= 0) {
    throw new ValidationError(`${fieldName} must be a positive number`);
  }
  return num;
};

module.exports = {
  // Error classes
  BaseError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ExternalServiceError,
  BlockchainError,
  
  // Middleware and utilities
  errorHandler,
  asyncHandler,
  logError,
  
  // Validators
  validateRequired,
  validateWalletAddress,
  validatePositiveNumber
};