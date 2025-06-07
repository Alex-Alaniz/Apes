/**
 * Test script to check and sync market resolution status
 * 
 * Usage: node test-resolution-sync.js [market_address]
 */

const { Connection, PublicKey } = require('@solana/web3.js');
require('dotenv').config();

// Market address mentioned in the logs that should be resolved
const MARKET_ADDRESS = process.argv[2] || '85rBcVsfkk773fshWgkt2viP4bNerrVc3SkbJo3Y2jUm';

// Configuration based on network
const NETWORK = process.env.VITE_SOLANA_NETWORK || process.env.SOLANA_NETWORK || 'devnet';

const NETWORK_CONFIG = {
  devnet: {
    programId: "F3cFKHXtoYeTnKE6hd7iy21oAZFGyz7dm2WQKS31M46Y",
    rpcUrl: "https://api.devnet.solana.com",
    tokenDecimals: 6
  },
  mainnet: {
    programId: "APESCaeLW5RuxNnpNARtDZnSgeVFC5f37Z3VFNKupJUS", 
    rpcUrl: process.env.SOLANA_RPC_URL || "https://mainnet.helius-rpc.com/?api-key=4a7d2ddd-3e83-4265-a9fb-0e4a5b51fd6d",
    tokenDecimals: 9
  }
};

const config = NETWORK_CONFIG[NETWORK];

console.log(`🔍 Testing resolution sync for market: ${MARKET_ADDRESS}`);
console.log(`🌐 Network: ${NETWORK}`);
console.log(`📡 RPC: ${config.rpcUrl}`);
console.log(`🎯 Program ID: ${config.programId}`);

async function testResolutionSync() {
  try {
    // Test via API endpoint
    console.log('\n🔄 Testing via API endpoint...');
    
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:5001';
    
    // First check current status
    const statusResponse = await fetch(`${backendUrl}/api/markets/resolution-status/${MARKET_ADDRESS}`);
    
    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      console.log('📊 Current status:', statusData);
      
      if (statusData.needsSync) {
        console.log('\n🔄 Status mismatch detected, triggering sync...');
        
        // Trigger sync
        const syncResponse = await fetch(`${backendUrl}/api/markets/sync-resolution/${MARKET_ADDRESS}`, {
          method: 'POST'
        });
        
        if (syncResponse.ok) {
          const syncData = await syncResponse.json();
          console.log('✅ Sync result:', syncData);
          
          if (syncData.wasResolved) {
            console.log('🎉 SUCCESS: Market was resolved and database updated!');
            console.log(`🏆 Winner: Option ${syncData.winningOption}`);
          } else {
            console.log('📊 Market is still active on blockchain');
          }
        } else {
          console.error('❌ Sync request failed:', await syncResponse.text());
        }
      } else {
        console.log('✅ Database and blockchain are already in sync');
      }
    } else {
      console.error('❌ Status check failed:', await statusResponse.text());
      
      // Try direct blockchain check if API fails
      console.log('\n🔄 Falling back to direct blockchain check...');
      await testDirectBlockchainCheck();
    }
    
    // Finally, test fetching resolved markets
    console.log('\n🏆 Testing resolved markets endpoint...');
    const resolvedResponse = await fetch(`${backendUrl}/api/markets/resolved`);
    
    if (resolvedResponse.ok) {
      const resolvedData = await resolvedResponse.json();
      console.log(`✅ Found ${resolvedData.total} resolved markets`);
      
      const targetMarket = resolvedData.markets.find(m => m.market_address === MARKET_ADDRESS);
      if (targetMarket) {
        console.log('🎯 Target market found in resolved list:', {
          question: targetMarket.question?.substring(0, 50),
          winner: targetMarket.winnerName,
          winningOption: targetMarket.winningOption,
          resolutionSource: targetMarket.resolutionSource
        });
      } else {
        console.log('⚠️ Target market not found in resolved list');
      }
    } else {
      console.error('❌ Resolved markets fetch failed:', await resolvedResponse.text());
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    
    // Try direct blockchain check as fallback
    console.log('\n🔄 Falling back to direct blockchain check...');
    await testDirectBlockchainCheck();
  }
}

async function testDirectBlockchainCheck() {
  try {
    const { BN } = require('@coral-xyz/anchor');
    const connection = new Connection(config.rpcUrl, 'confirmed');
    
    console.log(`🔴 Fetching account data for ${MARKET_ADDRESS}...`);
    
    const marketPubkey = new PublicKey(MARKET_ADDRESS);
    const accountInfo = await connection.getAccountInfo(marketPubkey);
    
    if (!accountInfo) {
      console.error('❌ Market account not found on blockchain');
      return;
    }
    
    console.log('✅ Market account found on blockchain');
    console.log(`📦 Account data size: ${accountInfo.data.length} bytes`);
    
    // Simple status check (status is at byte offset 8 + 32 + 32 + 1 + 200 + 2 + 50*4 + 1 + 8*3 + 32 + 1 = ~384)
    // For now, let's just check if we can read the data
    console.log('📊 Account data (first 100 bytes):', accountInfo.data.slice(0, 100).toString('hex'));
    
    // Try to read status byte (rough estimate)
    const statusByte = accountInfo.data[384] || accountInfo.data[300]; // Rough estimate
    console.log(`🔍 Estimated status byte: ${statusByte}`);
    
    if (statusByte === 1) {
      console.log('🎯 Market appears to be RESOLVED on blockchain (status = 1)');
    } else if (statusByte === 0) {
      console.log('📊 Market appears to be ACTIVE on blockchain (status = 0)');
    } else {
      console.log(`❓ Uncertain status: ${statusByte}`);
    }
    
  } catch (error) {
    console.error('❌ Direct blockchain check failed:', error);
  }
}

// Run the test
testResolutionSync(); 