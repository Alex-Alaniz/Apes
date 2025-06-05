const { Connection, PublicKey } = require('@solana/web3.js');
const { Program, AnchorProvider, BN } = require('@coral-xyz/anchor');
const fs = require('fs');
const path = require('path');

async function listMarketsStatus() {
  // Load the IDL
  const idlPath = path.join(__dirname, '../src/frontend/src/idl/market_system.json');
  const idl = JSON.parse(fs.readFileSync(idlPath, 'utf8'));
  
  const programId = new PublicKey('FGRM6t7tzY9FtFdjq5W9tdwNAkXfZCX1aEMvysdJipib');
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  
  try {
    // Fetch all market accounts
    const accounts = await connection.getProgramAccounts(programId, {
      filters: [
        {
          dataSize: 691 // Market account size
        }
      ]
    });
    
    console.log(`Found ${accounts.length} markets:\n`);
    
    for (const { pubkey, account } of accounts) {
      const data = account.data;
      let offset = 8; // Skip discriminator
      
      // Read authority
      const authority = new PublicKey(data.slice(offset, offset + 32));
      offset += 32;
      
      // Read creator
      const creator = new PublicKey(data.slice(offset, offset + 32));
      offset += 32;
      
      // Read market type (1 byte)
      offset += 1;
      
      // Read question (200 bytes)
      const question = Buffer.from(data.slice(offset, offset + 200)).toString('utf8').replace(/\0/g, '').trim();
      offset += 200;
      
      // Read option_1 (50 bytes)
      const option1 = Buffer.from(data.slice(offset, offset + 50)).toString('utf8').replace(/\0/g, '').trim();
      offset += 50;
      
      // Read option_2 (50 bytes)
      const option2 = Buffer.from(data.slice(offset, offset + 50)).toString('utf8').replace(/\0/g, '').trim();
      offset += 50;
      
      // Read resolution_date (8 bytes)
      offset += 8;
      
      // Read creator_fee_rate (8 bytes)
      offset += 8;
      
      // Read min_bet_amount (8 bytes)
      offset += 8;
      
      // Read token_mint (32 bytes)
      offset += 32;
      
      // Read status (1 byte)
      const statusByte = data[offset];
      const status = statusByte === 0 ? 'Active' : statusByte === 1 ? 'Resolved' : 'Cancelled';
      offset += 1;
      
      // Read winning_option (1 byte, 255 = None)
      const winningOptionByte = data[offset];
      const winningOption = winningOptionByte === 255 ? null : winningOptionByte;
      offset += 1;
      
      // Read option_1_pool (8 bytes)
      const option1Pool = new BN(data.slice(offset, offset + 8), 'le');
      offset += 8;
      
      // Read option_2_pool (8 bytes)
      const option2Pool = new BN(data.slice(offset, offset + 8), 'le');
      offset += 8;
      
      // Read total_pool (8 bytes)
      const totalPool = new BN(data.slice(offset, offset + 8), 'le');
      
      // Convert to human readable amounts (6 decimals for devnet)
      const decimals = 6;
      const option1PoolAmount = option1Pool.toNumber() / Math.pow(10, decimals);
      const option2PoolAmount = option2Pool.toNumber() / Math.pow(10, decimals);
      const totalPoolAmount = totalPool.toNumber() / Math.pow(10, decimals);
      
      console.log(`Market: ${pubkey.toString()}`);
      console.log(`Question: ${question}`);
      console.log(`Status: ${status}`);
      console.log(`Authority: ${authority.toString()}`);
      console.log(`Creator: ${creator.toString()}`);
      console.log(`Options:`);
      console.log(`  1. ${option1} - ${option1PoolAmount.toFixed(2)} APES (${totalPoolAmount > 0 ? ((option1PoolAmount / totalPoolAmount) * 100).toFixed(1) : '0'}%)`);
      console.log(`  2. ${option2} - ${option2PoolAmount.toFixed(2)} APES (${totalPoolAmount > 0 ? ((option2PoolAmount / totalPoolAmount) * 100).toFixed(1) : '0'}%)`);
      console.log(`Total Volume: ${totalPoolAmount.toFixed(2)} APES`);
      
      if (status === 'Resolved' && winningOption !== null) {
        console.log(`✓ Winner: Option ${winningOption + 1} - ${winningOption === 0 ? option1 : option2}`);
      }
      
      console.log('---\n');
    }
  } catch (error) {
    console.error('Error listing markets:', error);
  }
}

listMarketsStatus(); 