#!/usr/bin/env node

const { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const { Program, AnchorProvider, web3 } = require('@project-serum/anchor');
const fs = require('fs');
const path = require('path');

// Load configuration
const config = require('../src/config/networks.json');
const idl = require('../src/smart_contracts/market_system/target/idl/market_system.json');

const NETWORK = 'devnet';
const networkConfig = config[NETWORK];

async function simpleTest() {
  console.log('\n🚀 Simple Test on Devnet');
  console.log('========================\n');

  // Load wallet
  const walletPath = path.join(process.env.HOME, '.config/solana/id.json');
  const walletKeypair = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync(walletPath, 'utf-8')))
  );
  
  console.log(`Wallet: ${walletKeypair.publicKey.toString()}`);

  // Create connection
  const connection = new Connection(networkConfig.rpcUrl, 'confirmed');
  
  // Check balance
  const solBalance = await connection.getBalance(walletKeypair.publicKey);
  console.log(`SOL Balance: ${solBalance / LAMPORTS_PER_SOL} SOL\n`);

  // Create provider
  const wallet = {
    publicKey: walletKeypair.publicKey,
    signTransaction: async (tx) => {
      tx.partialSign(walletKeypair);
      return tx;
    },
    signAllTransactions: async (txs) => {
      return txs.map((tx) => {
        tx.partialSign(walletKeypair);
        return tx;
      });
    },
  };

  const provider = new AnchorProvider(connection, wallet, {
    commitment: 'confirmed',
  });

  // Create program
  const programId = new PublicKey(networkConfig.programId);
  const program = new Program(idl, programId, provider);

  console.log('📝 Calling initialize function...');
  
  try {
    const tx = await program.methods
      .initialize()
      .accounts({})
      .rpc();

    console.log('✅ Initialize called successfully!');
    console.log(`Transaction: ${tx}`);
    console.log(`Explorer: https://explorer.solana.com/tx/${tx}?cluster=devnet\n`);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run test
simpleTest().catch(console.error); 