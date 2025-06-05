import { Connection, PublicKey } from '@solana/web3.js';
import pkg from '@coral-xyz/anchor';
const { BN } = pkg;

const PROGRAM_ID = new PublicKey('FGRM6t7tzY9FtFdjq5W9tdwNAkXfZCX1aEMvysdJipib');
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

function deserializeMarket(accountData) {
  const data = accountData.data;
  let offset = 8; // Skip discriminator

  // Helper to read bytes
  const readBytes = (length) => {
    const bytes = data.slice(offset, offset + length);
    offset += length;
    return bytes;
  };

  // Helper to read string from fixed byte array
  const readFixedString = (length) => {
    const bytes = readBytes(length);
    return Buffer.from(bytes).toString('utf8').replace(/\0/g, '').trim();
  };

  // Helper to read u64
  const readU64 = () => {
    const bytes = readBytes(8);
    return new BN(bytes, 'le');
  };

  // Helper to read u16
  const readU16 = () => {
    const bytes = readBytes(2);
    return bytes[0] | (bytes[1] << 8);
  };

  // Helper to read u8
  const readU8 = () => {
    const bytes = readBytes(1);
    return bytes[0];
  };

  // Helper to read pubkey
  const readPubkey = () => {
    const bytes = readBytes(32);
    return new PublicKey(bytes);
  };

  // Read the Market struct
  const market = {
    authority: readPubkey(),
    creator: readPubkey(),
    market_type: readU8(),
    question: readFixedString(200),
    question_len: readU16(),
    option_1: readFixedString(50),
    option_2: readFixedString(50),
    option_3: readFixedString(50),
    option_4: readFixedString(50),
    option_count: readU8(),
    resolution_date: readU64(),
    creator_fee_rate: readU64(),
    min_bet_amount: readU64(),
    token_mint: readPubkey(),
    status: readU8(),
    winning_option: (() => {
      const byte = readU8();
      return byte === 255 ? null : byte;
    })(),
    option_1_pool: readU64(),
    option_2_pool: readU64(),
    option_3_pool: readU64(),
    option_4_pool: readU64(),
    total_pool: readU64(),
    market_id: readFixedString(32),
    category: readFixedString(20),
  };

  return market;
}

async function checkMarkets() {
  console.log('Checking markets for program:', PROGRAM_ID.toString());
  
  try {
    // Fetch all accounts owned by the program
    const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
      filters: [
        {
          dataSize: 691 // Market account size
        }
      ]
    });
    
    console.log(`\nFound ${accounts.length} market accounts\n`);
    
    if (accounts.length === 0) {
      console.log('No markets found. You need to create some markets first.');
      return;
    }
    
    // Display detailed info about each market
    accounts.forEach(({ pubkey, account }, index) => {
      const market = deserializeMarket(account);
      
      console.log(`════════════════════════════════════════════`);
      console.log(`Market ${index + 1}: ${pubkey.toString()}`);
      console.log(`════════════════════════════════════════════`);
      console.log(`Question: ${market.question}`);
      console.log(`Category: ${market.category || 'General'}`);
      console.log(`Type: ${market.market_type === 0 ? 'Binary' : 'Multi-Option'}`);
      console.log(`Status: ${market.status === 0 ? 'Active' : market.status === 1 ? 'Resolved' : 'Cancelled'}`);
      console.log(`\nOptions (${market.option_count}):`);
      
      // Display options based on option_count
      const options = [];
      if (market.option_1) options.push(market.option_1);
      if (market.option_2 && market.option_count >= 2) options.push(market.option_2);
      if (market.option_3 && market.option_count >= 3) options.push(market.option_3);
      if (market.option_4 && market.option_count >= 4) options.push(market.option_4);
      
      options.forEach((option, idx) => {
        const pool = idx === 0 ? market.option_1_pool :
                     idx === 1 ? market.option_2_pool :
                     idx === 2 ? market.option_3_pool :
                     market.option_4_pool;
        console.log(`  ${idx + 1}. ${option} - Pool: ${pool.toString()} units`);
      });
      
      console.log(`\nTotal Pool: ${market.total_pool.toString()} units`);
      console.log(`Min Bet: ${market.min_bet_amount.toString()} units`);
      
      if (market.winning_option !== null) {
        console.log(`Winning Option: ${market.winning_option + 1}`);
      }
      
      console.log('');
    });
    
  } catch (error) {
    console.error('Error checking markets:', error);
  }
}

checkMarkets(); 