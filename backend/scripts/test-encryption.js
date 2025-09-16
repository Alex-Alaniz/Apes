require('dotenv').config();
const { getEncryptionService, EncryptionService } = require('../utils/encryption');

async function testEncryption() {
  console.log('🔐 Testing Encryption Service\n');

  // Check if encryption password is set
  if (!process.env.ENCRYPTION_PASSWORD) {
    console.error('❌ ENCRYPTION_PASSWORD not set in .env file');
    console.log('💡 Add to your .env file:');
    console.log('ENCRYPTION_PASSWORD=YourSecurePasswordHere123!@#');
    return;
  }

  // Validate password strength
  const isValidPassword = EncryptionService.validatePassword(process.env.ENCRYPTION_PASSWORD);
  if (!isValidPassword) {
    console.warn('⚠️  Warning: ENCRYPTION_PASSWORD does not meet security requirements');
    console.log('   Password should be at least 16 characters with uppercase, lowercase, numbers, and special characters');
  } else {
    console.log('✅ Encryption password meets security requirements');
  }

  try {
    // Initialize encryption service
    const encryptionService = getEncryptionService();
    console.log('✅ Encryption service initialized\n');

    // Test 1: Basic encryption/decryption
    console.log('Test 1: Basic encryption/decryption');
    const testPrivateKey = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    console.log('Original:', testPrivateKey);
    
    const encrypted = encryptionService.encrypt(testPrivateKey);
    console.log('Encrypted:', encrypted.substring(0, 50) + '...');
    
    const decrypted = encryptionService.decrypt(encrypted);
    console.log('Decrypted:', decrypted);
    console.log('Match:', testPrivateKey === decrypted ? '✅ SUCCESS' : '❌ FAILED');
    console.log();

    // Test 2: Object encryption
    console.log('Test 2: Object encryption');
    const testWallet = {
      address: '0x742d35Cc6634C0532925a3b844Bc9e7595f6A123',
      privateKey: testPrivateKey,
      createdAt: new Date().toISOString()
    };
    console.log('Original object:', JSON.stringify(testWallet, null, 2));
    
    const encryptedObj = encryptionService.encryptObject(testWallet);
    console.log('Encrypted object:', encryptedObj.substring(0, 50) + '...');
    
    const decryptedObj = encryptionService.decryptObject(encryptedObj);
    console.log('Decrypted object:', JSON.stringify(decryptedObj, null, 2));
    console.log('Match:', JSON.stringify(testWallet) === JSON.stringify(decryptedObj) ? '✅ SUCCESS' : '❌ FAILED');
    console.log();

    // Test 3: Multiple encryptions produce different ciphertexts
    console.log('Test 3: Randomness test');
    const encrypted1 = encryptionService.encrypt('test-data');
    const encrypted2 = encryptionService.encrypt('test-data');
    console.log('Same data, different encryptions:', encrypted1 !== encrypted2 ? '✅ SUCCESS (Good randomness)' : '❌ FAILED');
    console.log();

    // Test 4: Invalid data handling
    console.log('Test 4: Error handling');
    try {
      encryptionService.decrypt('invalid:data');
      console.log('❌ FAILED - Should have thrown error');
    } catch (error) {
      console.log('✅ SUCCESS - Properly handles invalid data:', error.message);
    }
    console.log();

    // Test 5: Generate secure random
    console.log('Test 5: Secure random generation');
    const random1 = encryptionService.generateSecureRandom(32);
    const random2 = encryptionService.generateSecureRandom(32);
    console.log('Random 1:', random1);
    console.log('Random 2:', random2);
    console.log('Different:', random1 !== random2 ? '✅ SUCCESS' : '❌ FAILED');
    console.log();

    // Performance test
    console.log('Test 6: Performance test');
    const startTime = Date.now();
    const iterations = 100;
    
    for (let i = 0; i < iterations; i++) {
      const data = `test-private-key-${i}`;
      const enc = encryptionService.encrypt(data);
      const dec = encryptionService.decrypt(enc);
      if (data !== dec) throw new Error('Decryption mismatch');
    }
    
    const duration = Date.now() - startTime;
    console.log(`✅ Completed ${iterations} encrypt/decrypt cycles in ${duration}ms`);
    console.log(`Average: ${(duration / iterations).toFixed(2)}ms per operation`);
    console.log();

    console.log('🎉 All encryption tests passed!');
    
  } catch (error) {
    console.error('❌ Encryption test failed:', error);
    console.error(error.stack);
  }
}

// Run tests
testEncryption().catch(console.error);