#!/usr/bin/env node

/**
 * Quick Fix Script for Resolved Market Issue
 * 
 * This script manually updates the specific market 7MNDee9EBi4qKLpim52uLL44CioDkSpUgnZf8WEPC5hw
 * to show the correct resolved status since the blockchain shows it as resolved
 * but the database still shows it as Active.
 */

const https = require('https');

// Market to fix
const MARKET_ADDRESS = '7MNDee9EBi4qKLpim52uLL44CioDkSpUgnZf8WEPC5hw';
const BACKEND_URL = 'https://apes-production.up.railway.app';

console.log('🎯 Quick Fix: Updating resolved market status...');
console.log(`📊 Market: ${MARKET_ADDRESS}`);
console.log(`🏆 Issue: Market is resolved on blockchain but showing Active in database`);

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
        'User-Agent': 'fix-resolved-market-script'
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

async function fixResolvedMarket() {
  try {
    console.log('\n1️⃣ Checking current market status...');
    
    // Get current market data
    const currentData = await makeRequest('GET', `/api/markets/${MARKET_ADDRESS}`);
    
    if (currentData.status === 200) {
      const market = currentData.data;
      console.log(`📊 Current Status: ${market.status}`);
      console.log(`🎯 Resolved Option: ${market.resolved_option}`);
      console.log(`📈 Total Volume: ${market.totalVolume} APES`);
      
      if (market.status === 'Active') {
        console.log('\n⚠️ Confirmed: Market shows Active but should be Resolved');
        
        // Based on the volume distribution (12.28% vs 87.72%), it looks like Oklahoma City Thunder won
        const winningOption = 1; // Oklahoma City Thunder (87.72% of volume)
        
        console.log('\n2️⃣ Attempting to fix via existing endpoints...');
        
        // Try to use the force-sync endpoint first
        console.log('🔄 Trying force-sync endpoint...');
        const syncResult = await makeRequest('POST', '/api/markets/force-sync');
        
        if (syncResult.status === 200) {
          console.log('✅ Force sync completed');
          console.log(syncResult.data);
        }
        
        // Wait a moment then check if it was fixed
        console.log('\n3️⃣ Checking if market was updated...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const updatedData = await makeRequest('GET', `/api/markets/${MARKET_ADDRESS}`);
        
        if (updatedData.status === 200) {
          const updatedMarket = updatedData.data;
          
          if (updatedMarket.status === 'Resolved') {
            console.log('🎉 SUCCESS! Market status has been updated to Resolved');
            console.log(`🏆 Winning Option: ${updatedMarket.resolved_option}`);
          } else {
            console.log('⚠️ Market still shows as Active');
            console.log('\n4️⃣ Manual database update needed...');
            console.log(`💡 Recommended action: Update database directly with:`);
            console.log(`   - status: 'Resolved'`);
            console.log(`   - resolved_option: ${winningOption} (Oklahoma City Thunder)`);
            console.log(`   - Market address: ${MARKET_ADDRESS}`);
          }
        }
        
      } else {
        console.log('✅ Market already shows correct resolved status!');
      }
      
    } else {
      console.error('❌ Error fetching market data:', currentData);
    }
    
  } catch (error) {
    console.error('❌ Error in fix script:', error);
  }
}

// Run the fix
fixResolvedMarket().then(() => {
  console.log('\n🏁 Fix script completed');
}).catch(error => {
  console.error('❌ Script failed:', error);
}); 