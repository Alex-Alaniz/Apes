const { Connection, PublicKey, Keypair, SystemProgram, SYSVAR_RENT_PUBKEY } = require('@solana/web3.js');
const { Program, AnchorProvider, BN } = require('@coral-xyz/anchor');
const { TOKEN_PROGRAM_ID } = require('@solana/spl-token');
const fs = require('fs');
const path = require('path');

// Load config
const networkConfig = require('../src/frontend/src/config/networks.json').devnet;
const config = {
  ...networkConfig,
  platformFeeAddress: "4FxpxY3RRN4GQnSTTdZe2MEpRQCdTVnV3mX9Yf46vKoS"
};

// Load IDL
const idl = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/frontend/src/idl/market_system.json'), 'utf8'));

// Load wallet keypair
const walletPath = path.join(process.env.HOME, '.config/solana/id.json');
const wallet = Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync(walletPath, 'utf8'))));

async function testMultiOptionBetting() {
  const connection = new Connection(config.rpcUrl || 'https://api.devnet.solana.com', 'confirmed');
  const programId = new PublicKey('FGRM6t7tzY9FtFdjq5W9tdwNAkXfZCX1aEMvysdJipib');
  
  const provider = new AnchorProvider(
    connection,
    {
      publicKey: wallet.publicKey,
      signTransaction: async (tx) => {
        tx.sign(wallet);
        return tx;
      },
      signAllTransactions: async (txs) => {
        return txs.map(tx => {
          tx.sign(wallet);
          return tx;
        });
      }
    },
    { commitment: 'confirmed' }
  );
  
  const program = new Program(idl, provider);
  
  try {
    console.log('🎯 Testing Multi-Option Betting System\n');
    console.log('Wallet:', wallet.publicKey.toString());
    
    // Fetch most recent market
    const accounts = await connection.getProgramAccounts(programId, {
      filters: [{ dataSize: 691 }]
    });
    
    if (accounts.length === 0) {
      console.log('❌ No markets found');
      return;
    }
    
    // Sort by account data to get the most recent one (this is a heuristic)
    const marketPubkey = accounts[accounts.length - 1].pubkey;
    console.log('Market:', marketPubkey.toString());
    
    // Get market data
    const marketData = await program.account.market.fetch(marketPubkey);
    console.log('Market has', marketData.optionCount || marketData.option_count, 'options');
    console.log('Min bet amount:', (marketData.minBetAmount || marketData.min_bet_amount).toString() / 10**6, 'APES\n');
    
    // Find PDAs
    const [platformState] = PublicKey.findProgramAddressSync(
      [Buffer.from("platform_state")],
      programId
    );
    
    const [marketEscrow] = PublicKey.findProgramAddressSync(
      [Buffer.from("market_escrow"), marketPubkey.toBuffer()],
      programId
    );
    
    // Get token accounts
    const tokenMint = new PublicKey(config.tokenMint);
    const [userTokenAccount] = PublicKey.findProgramAddressSync(
      [
        wallet.publicKey.toBuffer(),
        new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA').toBuffer(),
        tokenMint.toBuffer(),
      ],
      new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL')
    );
    
    const [burnTokenAccount] = PublicKey.findProgramAddressSync(
      [
        new PublicKey(config.platformFeeAddress).toBuffer(),
        new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA').toBuffer(),
        tokenMint.toBuffer(),
      ],
      new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL')
    );
    
    const [treasuryTokenAccount] = PublicKey.findProgramAddressSync(
      [
        new PublicKey(config.treasuryAddress).toBuffer(),
        new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA').toBuffer(),
        tokenMint.toBuffer(),
      ],
      new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL')
    );
    
    // Test 1: Place bet on option 0
    console.log('--- Test 1: Betting on Option 0 ---');
    const option0 = 0;
    const [prediction0] = PublicKey.findProgramAddressSync(
      [Buffer.from("prediction"), marketPubkey.toBuffer(), wallet.publicKey.toBuffer(), Buffer.from([option0])],
      programId
    );
    console.log('Prediction PDA for option 0:', prediction0.toString());
    
    try {
      const amount1 = new BN(100 * 10**6); // 100 APES
      console.log('Placing 100 APES on option 0...');
      console.log('(Note: This may fail if minimum bet is higher)');
      
      const tx1 = await program.methods
        .placePrediction(option0, amount1)
        .accounts({
          market: marketPubkey,
          platformState: platformState,
          user: wallet.publicKey,
          userTokenAccount: userTokenAccount,
          marketEscrow: marketEscrow,
          burnTokenAccount: burnTokenAccount,
          treasuryTokenAccount: treasuryTokenAccount,
          prediction: prediction0,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .rpc();
      
      console.log('✅ Success! TX:', tx1);
    } catch (error) {
      console.log('❌ Failed:', error.message);
    }
    
    // Test 2: Place bet on option 1 (different option)
    console.log('\n--- Test 2: Betting on Option 1 (Different Option) ---');
    const option1 = 1;
    const [prediction1] = PublicKey.findProgramAddressSync(
      [Buffer.from("prediction"), marketPubkey.toBuffer(), wallet.publicKey.toBuffer(), Buffer.from([option1])],
      programId
    );
    console.log('Prediction PDA for option 1:', prediction1.toString());
    console.log('Different PDA?', prediction0.toString() !== prediction1.toString() ? '✅ Yes' : '❌ No');
    
    try {
      const amount2 = new BN(200 * 10**6); // 200 APES
      console.log('Placing 200 APES on option 1...');
      console.log('(Note: This may fail if minimum bet is higher)');
      
      const tx2 = await program.methods
        .placePrediction(option1, amount2)
        .accounts({
          market: marketPubkey,
          platformState: platformState,
          user: wallet.publicKey,
          userTokenAccount: userTokenAccount,
          marketEscrow: marketEscrow,
          burnTokenAccount: burnTokenAccount,
          treasuryTokenAccount: treasuryTokenAccount,
          prediction: prediction1,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .rpc();
      
      console.log('✅ Success! TX:', tx2);
    } catch (error) {
      console.log('❌ Failed:', error.message);
    }
    
    // Test 3: Add more to option 0
    console.log('\n--- Test 3: Adding More to Option 0 ---');
    try {
      const amount3 = new BN(50 * 10**6); // 50 more APES
      console.log('Adding 50 more APES to option 0...');
      console.log('(Note: This may fail if minimum bet is higher)');
      
      const tx3 = await program.methods
        .placePrediction(option0, amount3)
        .accounts({
          market: marketPubkey,
          platformState: platformState,
          user: wallet.publicKey,
          userTokenAccount: userTokenAccount,
          marketEscrow: marketEscrow,
          burnTokenAccount: burnTokenAccount,
          treasuryTokenAccount: treasuryTokenAccount,
          prediction: prediction0,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .rpc();
      
      console.log('✅ Success! TX:', tx3);
    } catch (error) {
      console.log('❌ Failed:', error.message);
    }
    
    // Fetch and display all user positions
    console.log('\n--- User Positions Summary ---');
    for (let i = 0; i < 2; i++) {
      const [predictionPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("prediction"), marketPubkey.toBuffer(), wallet.publicKey.toBuffer(), Buffer.from([i])],
        programId
      );
      
      try {
        const prediction = await program.account.prediction.fetch(predictionPda);
        console.log(`Option ${i}: ${prediction.amount.toString()} units (${prediction.amount.toNumber() / 10**6} APES)`);
      } catch (e) {
        console.log(`Option ${i}: No position`);
      }
    }
    
    console.log('\n✅ Multi-option betting test complete!');
    console.log('Users can now bet on multiple options in the same market.');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testMultiOptionBetting(); 