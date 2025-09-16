const crypto = require('crypto');

/**
 * Secure encryption utilities for wallet private keys
 */
class EncryptionService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.saltLength = 32;
    this.tagLength = 16;
    this.ivLength = 16;
    this.iterations = 100000; // PBKDF2 iterations
    
    // Validate encryption password is set
    if (!process.env.ENCRYPTION_PASSWORD) {
      throw new Error('ENCRYPTION_PASSWORD environment variable must be set');
    }
    
    // Derive key once during initialization for performance
    this.encryptionKey = this.deriveKey(process.env.ENCRYPTION_PASSWORD);
  }

  /**
   * Derive encryption key from password using PBKDF2
   */
  deriveKey(password, salt = null) {
    // Use provided salt or generate new one
    const keySalt = salt || crypto.randomBytes(this.saltLength);
    
    // Derive key using PBKDF2 with high iteration count
    const key = crypto.pbkdf2Sync(
      password,
      keySalt,
      this.iterations,
      32, // 256 bits
      'sha256'
    );
    
    return { key, salt: keySalt };
  }

  /**
   * Encrypt sensitive data (like private keys)
   * @param {string} plaintext - Data to encrypt
   * @returns {string} Encrypted data in format: salt:iv:authTag:ciphertext
   */
  encrypt(plaintext) {
    try {
      // Generate random IV
      const iv = crypto.randomBytes(this.ivLength);
      
      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey.key, iv);
      
      // Encrypt data
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Get auth tag
      const authTag = cipher.getAuthTag();
      
      // Combine all components
      const combined = [
        this.encryptionKey.salt.toString('hex'),
        iv.toString('hex'),
        authTag.toString('hex'),
        encrypted
      ].join(':');
      
      return combined;
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt sensitive data
   * @param {string} encryptedData - Encrypted data string
   * @returns {string} Decrypted plaintext
   */
  decrypt(encryptedData) {
    try {
      // Split components
      const parts = encryptedData.split(':');
      if (parts.length !== 4) {
        throw new Error('Invalid encrypted data format');
      }
      
      const [saltHex, ivHex, authTagHex, ciphertext] = parts;
      
      // Convert from hex
      const salt = Buffer.from(saltHex, 'hex');
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      
      // Derive key with stored salt
      const { key } = this.deriveKey(process.env.ENCRYPTION_PASSWORD, salt);
      
      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      decipher.setAuthTag(authTag);
      
      // Decrypt
      let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Generate secure random bytes
   * @param {number} length - Number of bytes
   * @returns {string} Hex-encoded random bytes
   */
  generateSecureRandom(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Hash sensitive data (one-way)
   * @param {string} data - Data to hash
   * @returns {string} Hex-encoded hash
   */
  hash(data) {
    return crypto
      .createHash('sha256')
      .update(data)
      .digest('hex');
  }

  /**
   * Validate encryption password strength
   * @param {string} password - Password to validate
   * @returns {boolean} True if password meets requirements
   */
  static validatePassword(password) {
    // At least 16 characters, contains uppercase, lowercase, number, and special char
    const minLength = 16;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    return (
      password.length >= minLength &&
      hasUpperCase &&
      hasLowerCase &&
      hasNumbers &&
      hasSpecialChar
    );
  }

  /**
   * Encrypt JSON object
   * @param {Object} obj - Object to encrypt
   * @returns {string} Encrypted JSON string
   */
  encryptObject(obj) {
    const jsonString = JSON.stringify(obj);
    return this.encrypt(jsonString);
  }

  /**
   * Decrypt JSON object
   * @param {string} encryptedData - Encrypted JSON string
   * @returns {Object} Decrypted object
   */
  decryptObject(encryptedData) {
    const jsonString = this.decrypt(encryptedData);
    return JSON.parse(jsonString);
  }
}

// Export singleton instance
let encryptionService;

module.exports = {
  getEncryptionService: () => {
    if (!encryptionService) {
      encryptionService = new EncryptionService();
    }
    return encryptionService;
  },
  EncryptionService
};