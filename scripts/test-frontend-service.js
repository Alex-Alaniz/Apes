import { Connection, PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

// Setup
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const PROGRAM_ID = new PublicKey('FGRM6t7tzY9FtFdjq5W9tdwNAkXfZCX1aEMvysdJipib');

// Test market IDs
const marketIds = [
  '2vJreEwmcHisSqeXpPPcmgupddiMTLRpXo87baimWJQV', // Bitcoin market
  'qJpxmrmsKqiBtvEnBTmEd7FF67R9wgDpWCn3Upoo5My'  // Super Bowl market
];

// Copy the deserializeMarket function from marketService
function deserializeMarket(publicKey, accountData) {
  const data = accountData.data;
  let offset = 8; // Skip discriminator

  const readBytes = (length) => {
    const bytes = data.slice(offset, offset + length);
    offset += length;
    return bytes;
  };

  const readFixedString = (length) => {
    const bytes = readBytes(length);
    return Buffer.from(bytes).toString('utf8').replace(/\0/g, '').trim();
  };

  const readU64 = () => {
    const bytes = readBytes(8);
    return new BN(bytes, 'le');
  };

  const readU16 = () => {
    const bytes = readBytes(2);
    return bytes[0] | (bytes[1] << 8);
  };

  const readU8 = () => {
    const bytes = readBytes(1);
    return bytes[0];
  };

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

  // Build options array
  const options = [];
  if (market.option_1) options.push(market.option_1);
  if (market.option_2 && market.option_count >= 2) options.push(market.option_2);
  if (market.option_3 && market.option_count >= 3) options.push(market.option_3);
  if (market.option_4 && market.option_count >= 4) options.push(market.option_4);

  // Transform to frontend format
  const result = {
    publicKey,
    account: {
      authority: market.authority,
      creator: market.creator,
      market_type: market.market_type === 0 ? { binary: {} } : { multiOption: {} },
      question: market.question,
      options: options,
      option_count: market.option_count,
      status: market.status === 0 ? { active: {} } : market.status === 1 ? { resolved: {} } : { cancelled: {} },
      winningOption: market.winning_option,
      optionPools: [market.option_1_pool, market.option_2_pool, market.option_3_pool, market.option_4_pool].slice(0, market.option_count),
      totalPool: market.total_pool,
    }
  };

  return result;
}

// Copy transformMarket from marketService
function transformMarket(publicKey, account) {
  // This is the key part - checking how winningOption is handled
  const winningOption = account.winningOption !== undefined ? account.winningOption : account.winning_option;
  
  console.log('transformMarket input:', {
    publicKey: publicKey.toString(),
    winningOption: account.winningOption,
    winning_option: account.winning_option,
    finalWinningOption: winningOption,
    options: account.options
  });
  
  return {
    publicKey: publicKey.toString(),
    question: account.question || '',
    options: account.options || [],
    winningOption: winningOption,
    status: account.status.resolved ? 'Resolved' : 'Active',
  };
}

async function testMarketFetch() {
  console.log('Testing market data fetching and transformation...\n');
  
  for (const marketId of marketIds) {
    try {
      const marketPubkey = new PublicKey(marketId);
      const accountInfo = await connection.getAccountInfo(marketPubkey);
      
      if (accountInfo) {
        console.log(`\n=== Market: ${marketId} ===`);
        
        // Deserialize
        const deserialized = deserializeMarket(marketPubkey, accountInfo);
        console.log('Deserialized winningOption:', deserialized.account.winningOption);
        
        // Transform
        const transformed = transformMarket(deserialized.publicKey, deserialized.account);
        console.log('Transformed winningOption:', transformed.winningOption);
        console.log('Options:', transformed.options);
        
        // Show which option is the winner
        if (transformed.winningOption !== null && transformed.winningOption !== undefined) {
          console.log(`Winner: Option ${transformed.winningOption} - "${transformed.options[transformed.winningOption]}"`);
        }
      }
    } catch (error) {
      console.error(`Error with market ${marketId}:`, error.message);
    }
  }
}

testMarketFetch(); 