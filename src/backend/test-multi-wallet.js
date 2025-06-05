require('dotenv').config();
const twitterService = require('./services/twitterServiceV2');
const db = require('./config/database');

async function testMultiWalletLinking() {
  console.log('=== Multi-Wallet Linking Test ===\n');
  
  // Test wallets
  const existingWallet = '5eC9qH2vZQki2FKLmJR2WCsDw8MxzomyJDyfzoNHM2kE';
  const newWallet = '7TEST7890123456789012345678901234567890123';
  const twitterId = '1869551350175961089';
  
  try {
    // 1. Check current state
    console.log('1. Current State:');
    const currentLinks = await db.query('SELECT * FROM wallet_twitter_links');
    console.log('Existing links:', currentLinks.rows);
    
    const twitterAccounts = await db.query('SELECT * FROM twitter_accounts');
    console.log('Twitter accounts:', twitterAccounts.rows);
    
    // 2. Test getting Twitter account by existing wallet
    console.log('\n2. Testing getTwitterByWallet for existing wallet:');
    try {
      const existingTwitter = await twitterService.getTwitterByWallet(existingWallet);
      console.log('✓ Found Twitter account:', existingTwitter);
    } catch (error) {
      console.log('✗ Error:', error.message);
    }
    
    // 3. Test getting Twitter account by new wallet (should be null)
    console.log('\n3. Testing getTwitterByWallet for new wallet:');
    try {
      const newTwitter = await twitterService.getTwitterByWallet(newWallet);
      console.log('Result:', newTwitter || 'null (expected)');
    } catch (error) {
      console.log('✗ Error:', error.message);
    }
    
    // 4. Test database constraint by manually trying to insert duplicate
    console.log('\n4. Testing unique constraint:');
    try {
      await db.query(
        'INSERT INTO wallet_twitter_links (wallet_address, twitter_id, is_primary_wallet) VALUES ($1, $2, false)',
        [newWallet, twitterId]
      );
      console.log('✓ Successfully inserted new wallet-twitter link');
      
      // Clean up the test insert
      await db.query('DELETE FROM wallet_twitter_links WHERE wallet_address = $1', [newWallet]);
      console.log('✓ Cleaned up test insert');
      
    } catch (error) {
      console.log('✗ Database error:', error.message);
    }
    
    // 5. Check if new wallet user exists
    console.log('\n5. Checking if test user exists:');
    const userExists = await db.query('SELECT * FROM users WHERE wallet_address = $1', [newWallet]);
    console.log('New wallet user exists:', userExists.rows.length > 0);
    
    if (userExists.rows.length === 0) {
      console.log('Creating test user...');
      await db.query('INSERT INTO users (wallet_address) VALUES ($1)', [newWallet]);
      await db.query('INSERT INTO user_stats (wallet_address) VALUES ($1)', [newWallet]);
      console.log('✓ Created test user');
    }
    
    // 6. Test the linking logic manually
    console.log('\n6. Testing manual linking logic:');
    
    // Check if this Twitter account already exists
    const existingTwitter = await db.query(
      'SELECT twitter_id FROM twitter_accounts WHERE twitter_id = $1',
      [twitterId]
    );
    console.log('Twitter account exists:', existingTwitter.rows.length > 0);
    
    // Check if this wallet is already linked to a different Twitter account
    const existingLink = await db.query(
      'SELECT twitter_id FROM wallet_twitter_links WHERE wallet_address = $1',
      [newWallet]
    );
    console.log('Wallet already linked to different Twitter:', existingLink.rows.length > 0);
    
    if (existingLink.rows.length > 0 && existingLink.rows[0].twitter_id !== twitterId) {
      console.log('✗ Would throw error: This wallet is already linked to a different Twitter account');
    } else {
      console.log('✓ Wallet can be linked to this Twitter account');
    }
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    // Clean up any test data
    await db.query('DELETE FROM wallet_twitter_links WHERE wallet_address = $1', [newWallet]);
    await db.query('DELETE FROM user_stats WHERE wallet_address = $1', [newWallet]);
    await db.query('DELETE FROM users WHERE wallet_address = $1', [newWallet]);
    console.log('\n✓ Cleaned up test data');
    process.exit(0);
  }
}

testMultiWalletLinking().catch(console.error); 