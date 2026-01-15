#!/usr/bin/env node

/**
 * Fix All Resolved Markets Script
 * 
 * This script checks all Active markets in the database against the blockchain
 * and syncs any that are actually resolved onchain but showing as Active in the database.
 */

const https = require('https');

const BACKEND_URL = process.env.BACKEND_URL || 'https://apes-production.up.railway.app';

console.log('🔧 Fix All Resolved Markets - Batch Sync Script');
console.log(`🌐 Backend URL: ${BACKEND_URL}`);
console.log('📊 This script will check all Active markets and sync any that are resolved onchain\n');

// Function to make HTTP request
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BACKEND_URL + path);
    
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'fix-resolved-markets-script'
      }
    };

    if (data) {
      const postData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: parsed });
        } catch (error) {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function fixAllResolvedMarkets() {
  try {
    console.log('1️⃣ Fetching all markets from database...');
    
    // Get all markets
    const marketsResponse = await makeRequest('GET', '/api/markets');
    
    if (marketsResponse.status !== 200) {
      throw new Error(`Failed to fetch markets: ${marketsResponse.status}`);
    }
    
    const allMarkets = marketsResponse.data.markets || marketsResponse.data;
    const activeMarkets = allMarkets.filter(market => market.status === 'Active');
    
    console.log(`📊 Found ${allMarkets.length} total markets, ${activeMarkets.length} are Active`);
    
    if (activeMarkets.length === 0) {
      console.log('✅ No Active markets to check. All done!');
      return;
    }
    
    console.log('\n2️⃣ Checking each Active market against blockchain...\n');
    
    let resolvedCount = 0;
    let errorCount = 0;
    const results = [];
    
    for (let i = 0; i < activeMarkets.length; i++) {
      const market = activeMarkets[i];
      const marketAddress = market.market_address || market.publicKey || market.address;
      
      console.log(`📍 [${i + 1}/${activeMarkets.length}] Checking: ${market.question?.substring(0, 50)}...`);
      console.log(`   Market: ${marketAddress}`);
      
      try {
        // First check status without modifying
        const statusResponse = await makeRequest('GET', `/api/markets/resolution-status/${marketAddress}`);
        
        if (statusResponse.status === 200 && statusResponse.data.needsSync) {
          console.log(`   ⚠️ Status mismatch detected - blockchain shows resolved!`);
          
          // Trigger sync
          const syncResponse = await makeRequest('POST', `/api/markets/sync-resolution/${marketAddress}`);
          
          if (syncResponse.status === 200 && syncResponse.data.success && syncResponse.data.wasResolved) {
            console.log(`   ✅ Successfully synced! Winner: Option ${syncResponse.data.winningOption}`);
            resolvedCount++;
            results.push({
              market: marketAddress,
              question: market.question,
              status: 'synced',
              winningOption: syncResponse.data.winningOption
            });
          } else {
            console.log(`   ❌ Sync failed:`, syncResponse.data.error || 'Unknown error');
            errorCount++;
            results.push({
              market: marketAddress,
              question: market.question,
              status: 'error',
              error: syncResponse.data.error || 'Sync failed'
            });
          }
        } else if (statusResponse.status === 200 && !statusResponse.data.needsSync) {
          console.log(`   📊 Market is correctly synced (both show Active)`);
          results.push({
            market: marketAddress,
            question: market.question,
            status: 'already_synced'
          });
        } else {
          console.log(`   ⚠️ Could not check status:`, statusResponse.data.error || 'Status check failed');
          errorCount++;
          results.push({
            market: marketAddress,
            question: market.question,
            status: 'check_failed',
            error: statusResponse.data.error || 'Status check failed'
          });
        }
        
        // Add delay between requests to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.log(`   ❌ Error processing market:`, error.message);
        errorCount++;
        results.push({
          market: marketAddress,
          question: market.question,
          status: 'error',
          error: error.message
        });
      }
      
      console.log(''); // Empty line for readability
    }
    
    // Summary
    console.log('🎯 SUMMARY:');
    console.log(`✅ Markets synced (were resolved onchain): ${resolvedCount}`);
    console.log(`📊 Markets already in sync: ${results.filter(r => r.status === 'already_synced').length}`);
    console.log(`❌ Errors encountered: ${errorCount}`);
    console.log(`📋 Total markets checked: ${activeMarkets.length}`);
    
    if (resolvedCount > 0) {
      console.log('\n🏆 Successfully synced resolved markets:');
      results.filter(r => r.status === 'synced').forEach(r => {
        console.log(`   • ${r.question?.substring(0, 60)}... (Winner: Option ${r.winningOption})`);
      });
    }
    
    if (errorCount > 0) {
      console.log('\n❌ Markets with errors:');
      results.filter(r => r.status === 'error' || r.status === 'check_failed').forEach(r => {
        console.log(`   • ${r.question?.substring(0, 60)}... (Error: ${r.error})`);
      });
    }
    
    console.log('\n🏁 Batch sync completed!');
    
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

// Run the fix
fixAllResolvedMarkets().then(() => {
  console.log('\n✨ All done! Your markets should now be properly synced.');
}).catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
}); 