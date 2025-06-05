import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import anchorPkg from '@coral-xyz/anchor';
const { AnchorProvider, Program, setProvider, Wallet } = anchorPkg;
import fs from 'fs';
import bs58 from 'bs58';
import dotenv from 'dotenv';
import path from 'path';
import BN from 'bn.js';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '..', '.env') });

// Load wallet
const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
if (!privateKey) {
  throw new Error('DEPLOYER_PRIVATE_KEY not found in .env file');
}
const keypair = Keypair.fromSecretKey(bs58.decode(privateKey));

// Setup
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const PROGRAM_ID = new PublicKey('FGRM6t7tzY9FtFdjq5W9tdwNAkXfZCX1aEMvysdJipib');

// Load IDL
const idl = JSON.parse(fs.readFileSync('../src/frontend/src/idl/market_system.json', 'utf8'));

// Test markets
const marketIds = [
  '2vJreEwmcHisSqeXpPPcmgupddiMTLRpXo87baimWJQV', // Bitcoin market
  'qJpxmrmsKqiBtvEnBTmEd7FF67R9wgDpWCn3Upoo5My'  // Super Bowl market
];

// Custom deserializer (from marketService)
function customDeserializeMarket(publicKey, accountData) {
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

  // Track the offset as we read
  console.log('\nCustom deserializer offsets:');
  console.log('Start offset:', offset);
  
  const authority = readPubkey();
  console.log('After authority:', offset);
  
  const creator = readPubkey();
  console.log('After creator:', offset);
  
  const market_type = readU8();
  console.log('After market_type:', offset, 'value:', market_type);
  
  const question = readFixedString(200);
  console.log('After question:', offset);
  
  const question_len = readU16();
  console.log('After question_len:', offset, 'value:', question_len);
  
  const option_1 = readFixedString(50);
  console.log('After option_1:', offset);
  
  const option_2 = readFixedString(50);
  console.log('After option_2:', offset);
  
  const option_3 = readFixedString(50);
  console.log('After option_3:', offset);
  
  const option_4 = readFixedString(50);
  console.log('After option_4:', offset);
  
  const option_count = readU8();
  console.log('After option_count:', offset, 'value:', option_count);
  
  const resolution_date = readU64();
  console.log('After resolution_date:', offset);
  
  const creator_fee_rate = readU64();
  console.log('After creator_fee_rate:', offset);
  
  const min_bet_amount = readU64();
  console.log('After min_bet_amount:', offset);
  
  const token_mint = readPubkey();
  console.log('After token_mint:', offset);
  
  const status = readU8();
  console.log('After status:', offset, 'value:', status);
  
  const winning_option_byte = readU8();
  const winning_option = winning_option_byte === 255 ? null : winning_option_byte;
  console.log('After winning_option:', offset, 'raw byte:', winning_option_byte, 'value:', winning_option);
  
  return {
    question,
    option_count,
    option_1,
    option_2,
    status,
    winning_option
  };
}

async function compareDeserializers() {
  const wallet = new Wallet(keypair);
  const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
  setProvider(provider);
  const program = new Program(idl, provider);
  
  console.log('Comparing Anchor vs Custom deserialization...\n');
  
  for (const marketId of marketIds) {
    try {
      const market = new PublicKey(marketId);
      
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Market: ${marketId}`);
      console.log('='.repeat(60));
      
      // Anchor deserialization
      const anchorData = await program.account.market.fetch(market);
      console.log('\nAnchor deserialization:');
      console.log('Question:', String.fromCharCode(...anchorData.question).replace(/\0/g, '').trim());
      console.log('Status:', anchorData.status);
      console.log('Winning option:', anchorData.winningOption);
      console.log('Option 1:', String.fromCharCode(...anchorData.option1).replace(/\0/g, '').trim());
      console.log('Option 2:', String.fromCharCode(...anchorData.option2).replace(/\0/g, '').trim());
      
      // Custom deserialization
      const accountInfo = await connection.getAccountInfo(market);
      if (accountInfo) {
        const customData = customDeserializeMarket(market, accountInfo);
        console.log('\nCustom deserialization:');
        console.log('Question:', customData.question);
        console.log('Status:', customData.status);
        console.log('Winning option:', customData.winning_option);
        console.log('Option 1:', customData.option_1);
        console.log('Option 2:', customData.option_2);
        
        // Compare
        console.log('\nComparison:');
        console.log('Winning option match?', anchorData.winningOption === customData.winning_option);
        if (anchorData.winningOption !== customData.winning_option) {
          console.log('❌ MISMATCH! Anchor:', anchorData.winningOption, 'Custom:', customData.winning_option);
        }
      }
      
    } catch (error) {
      console.error(`Error with market ${marketId}:`, error.message);
    }
  }
}

compareDeserializers(); 