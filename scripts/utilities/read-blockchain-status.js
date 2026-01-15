#!/usr/bin/env node

/**
 * Read Blockchain Status Script
 * 
 * Reads the actual market resolution status directly from the Solana blockchain
 * to see if the Stanley Cup Finals Game 2 market is resolved and which option won.
 */

const { Connection, PublicKey } = require('@solana/web3.js');

// Configuration
const NETWORK = process.env.VITE_SOLANA_NETWORK || process.env.SOLANA_NETWORK || 'devnet';
const MARKET_ADDRESS = '85rBcVsfkk773fshWgkt2viP4bNerrVc3SkbJo3Y2jUm';

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

console.log('🔍 Reading blockchain status for Stanley Cup Finals Game 2...');
console.log(`📊 Market Address: ${MARKET_ADDRESS}`);
console.log(`🌐 Network: ${NETWORK}`);
console.log(`📡 RPC: ${config.rpcUrl}`);

async function readBlockchainStatus() {
  try {
    const connection = new Connection(config.rpcUrl, 'confirmed');
    const marketPubkey = new PublicKey(MARKET_ADDRESS);
    
    console.log('\n🔄 Fetching market account data from blockchain...');
    
    // Fetch market account data directly from blockchain
    const accountInfo = await connection.getAccountInfo(marketPubkey);
    
    if (!accountInfo) {
      console.error('❌ Market account not found on blockchain');
      return;
    }
    
    console.log('✅ Market account found on blockchain');
    console.log(`📦 Account data size: ${accountInfo.data.length} bytes`);
    
    // Deserialize market data
    const marketData = deserializeMarketAccount(accountInfo.data);
    
    console.log('\n📊 BLOCKCHAIN STATUS:');
    console.log('================================');
    console.log(`Market: ${marketData.question}`);
    console.log(`Status: ${marketData.status}`);
    console.log(`Options:`);
    console.log(`  0: ${marketData.option1}`);
    console.log(`  1: ${marketData.option2}`);
    console.log(`Winning Option: ${marketData.winningOption}`);
    console.log(`Total Pool: ${marketData.totalPool.toString()}`);
    console.log(`Option Pools:`);
    console.log(`  ${marketData.option1}: ${marketData.option1Pool.toString()}`);
    console.log(`  ${marketData.option2}: ${marketData.option2Pool.toString()}`);
    
    if (marketData.status === 'Resolved') {
      console.log('\n🎯 RESOLUTION DETAILS:');
      console.log(`✅ Market IS RESOLVED on blockchain`);
      console.log(`🏆 Winner: Option ${marketData.winningOption} (${marketData.winningOption === 0 ? marketData.option1 : marketData.option2})`);
      
      return {
        isResolved: true,
        winningOption: marketData.winningOption,
        winnerName: marketData.winningOption === 0 ? marketData.option1 : marketData.option2,
        marketData
      };
    } else {
      console.log('\n📊 MARKET STATUS:');
      console.log(`⏳ Market is still ${marketData.status} on blockchain`);
      
      return {
        isResolved: false,
        status: marketData.status,
        marketData
      };
    }
    
  } catch (error) {
    console.error('❌ Error reading blockchain status:', error);
    console.error('Details:', error.message);
  }
}

function deserializeMarketAccount(data) {
  let offset = 8; // Skip discriminator

  // Helper functions
  const readPubkey = () => {
    const bytes = data.slice(offset, offset + 32);
    offset += 32;
    return new PublicKey(bytes);
  };

  const readU64 = () => {
    const bytes = data.slice(offset, offset + 8);
    offset += 8;
    return BigInt('0x' + bytes.reverse().map(b => b.toString(16).padStart(2, '0')).join(''));
  };

  const readU8 = () => {
    const byte = data[offset];
    offset += 1;
    return byte;
  };

  const readU16 = () => {
    const bytes = data.slice(offset, offset + 2);
    offset += 2;
    return bytes[0] | (bytes[1] << 8);
  };

  const readFixedString = (length) => {
    const bytes = data.slice(offset, offset + length);
    offset += length;
    return Buffer.from(bytes).toString('utf8').replace(/\0/g, '').trim();
  };

  try {
    // Read market struct based on actual on-chain layout
    const market = {
      authority: readPubkey(),
      creator: readPubkey(),
      marketType: readU8(),
      question: readFixedString(200),
      questionLen: readU16(),
      option1: readFixedString(50),
      option2: readFixedString(50),
      option3: readFixedString(50),
      option4: readFixedString(50),
      optionCount: readU8(),
      resolutionDate: readU64(),
      creatorFeeRate: readU64(),
      minBetAmount: readU64(),
      tokenMint: readPubkey(),
      status: readU8(),
      winningOption: (() => {
        const discriminator = readU8();
        return discriminator === 0 ? null : readU8();
      })(),
      option1Pool: readU64(),
      option2Pool: readU64(),
      option3Pool: readU64(),
      option4Pool: readU64(),
      totalPool: readU64(),
      marketId: readFixedString(32),
      category: readFixedString(20),
    };

    return {
      ...market,
      status: market.status === 0 ? 'Active' : market.status === 1 ? 'Resolved' : 'Cancelled'
    };
  } catch (error) {
    console.error('❌ Error deserializing market data:', error);
    throw error;
  }
}

// Run the script
readBlockchainStatus().then((result) => {
  if (result) {
    console.log('\n🎉 Blockchain read completed successfully!');
    
    if (result.isResolved) {
      console.log('\n💡 NEXT STEPS:');
      console.log(`Database needs to be updated with:`);
      console.log(`- status: 'Resolved'`);
      console.log(`- resolved_option: ${result.winningOption}`);
      console.log(`- Winner: ${result.winnerName}`);
    }
  }
}).catch((error) => {
  console.error('❌ Script failed:', error);
}); 