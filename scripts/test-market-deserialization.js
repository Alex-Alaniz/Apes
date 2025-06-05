import { Connection, PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

// Setup
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const PROGRAM_ID = new PublicKey('FGRM6t7tzY9FtFdjq5W9tdwNAkXfZCX1aEMvysdJipib');

// Test market
const marketId = '2vJreEwmcHisSqeXpPPcmgupddiMTLRpXo87baimWJQV'; // Bitcoin market

// Copy the deserializeMarket function from marketService
function deserializeMarket(publicKey, accountData) {
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

  console.log('\n=== Reading Market Data ===');
  console.log('Starting offset:', offset);

  // Read the Market struct based on the actual on-chain layout
  const market = {
    authority: readPubkey(),
    creator: readPubkey(),
    market_type: readU8(), // Simple enum as u8
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
    status: readU8(), // Simple enum as u8
    winning_option: (() => {
      const byte = readU8();
      console.log('Raw winning_option byte:', byte);
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

  console.log('\nDeserialized market:');
  console.log('Question:', market.question);
  console.log('Status:', market.status, '(0=Active, 1=Resolved, 2=Cancelled)');
  console.log('Winning option:', market.winning_option);
  console.log('Options:');
  console.log('  0:', market.option_1);
  console.log('  1:', market.option_2);

  // Build options array based on option_count
  const options = [];
  if (market.option_1) options.push(market.option_1);
  if (market.option_2 && market.option_count >= 2) options.push(market.option_2);
  if (market.option_3 && market.option_count >= 3) options.push(market.option_3);
  if (market.option_4 && market.option_count >= 4) options.push(market.option_4);

  // Build option pools array
  const optionPools = [
    market.option_1_pool,
    market.option_2_pool,
    market.option_3_pool,
    market.option_4_pool
  ].slice(0, market.option_count);

  // Convert to format expected by transformMarket
  const result = {
    publicKey,
    account: {
      authority: market.authority,
      creator: market.creator,
      market_type: market.market_type === 0 ? { binary: {} } : { multiOption: {} },
      question: market.question,
      options: options,
      option_count: market.option_count,
      resolutionDate: market.resolution_date,
      creatorFeeRate: market.creator_fee_rate,
      minBetAmount: market.min_bet_amount,
      tokenMint: market.token_mint,
      status: market.status === 0 ? { active: {} } : market.status === 1 ? { resolved: {} } : { cancelled: {} },
      winningOption: market.winning_option,
      optionPools: optionPools,
      totalPool: market.total_pool,
      marketId: market.market_id,
      category: market.category,
    }
  };

  console.log('\nFinal result:');
  console.log('winningOption:', result.account.winningOption);
  console.log('options:', result.account.options);
  
  return result;
}

async function testDeserialization() {
  console.log('Testing market deserialization...');
  console.log('Market ID:', marketId);
  
  try {
    const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
      filters: [
        {
          memcmp: {
            offset: 0,
            bytes: new PublicKey(marketId).toBase58()
          }
        }
      ]
    });
    
    if (accounts.length === 0) {
      // Try fetching directly
      const accountInfo = await connection.getAccountInfo(new PublicKey(marketId));
      if (accountInfo) {
        console.log('\nFound account directly');
        console.log('Data length:', accountInfo.data.length);
        deserializeMarket(new PublicKey(marketId), accountInfo);
      } else {
        console.log('Market not found');
      }
    } else {
      console.log(`Found ${accounts.length} accounts`);
      const { pubkey, account } = accounts[0];
      deserializeMarket(pubkey, account);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testDeserialization(); 