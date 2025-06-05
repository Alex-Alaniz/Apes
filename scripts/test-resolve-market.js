const { Connection, PublicKey, Keypair } = require('@solana/web3.js');
const { Program, AnchorProvider, BN, web3 } = require('@coral-xyz/anchor');
const fs = require('fs');
const path = require('path');
const { TOKEN_PROGRAM_ID } = require('@solana/spl-token');

async function resolveMarket() {
  // Load the IDL
  const idlPath = path.join(__dirname, '../src/frontend/src/idl/market_system.json');
  const idl = JSON.parse(fs.readFileSync(idlPath, 'utf8'));
  
  const programId = new PublicKey('FGRM6t7tzY9FtFdjq5W9tdwNAkXfZCX1aEMvysdJipib');
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  
  // Load the test wallet
  const walletPath = path.join(__dirname, 'test-wallet.json');
  const walletKeypair = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(walletPath, 'utf-8')))
  );
  
  const wallet = {
    publicKey: walletKeypair.publicKey,
    signTransaction: async (tx) => {
      tx.sign(walletKeypair);
      return tx;
    },
    signAllTransactions: async (txs) => {
      txs.forEach(tx => tx.sign(walletKeypair));
      return txs;
    }
  };
  
  const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
  const program = new Program(idl, programId, provider);
  
  // Get market to resolve from command line
  const marketPubkey = process.argv[2];
  const winningOption = parseInt(process.argv[3]);
  
  if (!marketPubkey || isNaN(winningOption)) {
    console.error('Usage: node test-resolve-market.js <market_pubkey> <winning_option>');
    console.error('Example: node test-resolve-market.js ABC123... 0');
    console.error('(winning_option: 0 for first option, 1 for second option)');
    return;
  }
  
  try {
    // Fetch market data
    const market = await program.account.market.fetch(new PublicKey(marketPubkey));
    console.log('Market question:', Buffer.from(market.question).toString('utf8').replace(/\0/g, '').trim());
    console.log('Option 1:', Buffer.from(market.option_1).toString('utf8').replace(/\0/g, '').trim());
    console.log('Option 2:', Buffer.from(market.option_2).toString('utf8').replace(/\0/g, '').trim());
    console.log('Current status:', market.status);
    
    if (market.status.resolved) {
      console.log('Market is already resolved!');
      return;
    }
    
    console.log(`\nResolving market with winning option: ${winningOption}`);
    
    // Only the market authority can resolve
    if (!market.authority.equals(wallet.publicKey)) {
      console.error('Error: Only the market authority can resolve the market');
      console.error('Market authority:', market.authority.toString());
      console.error('Your wallet:', wallet.publicKey.toString());
      return;
    }
    
    // Resolve the market
    const tx = await program.methods
      .resolveMarket(winningOption)
      .accounts({
        market: new PublicKey(marketPubkey),
        resolver: wallet.publicKey,
      })
      .rpc();
    
    console.log('Market resolved successfully!');
    console.log('Transaction:', tx);
    
    // Verify resolution
    const updatedMarket = await program.account.market.fetch(new PublicKey(marketPubkey));
    console.log('\nUpdated market status:', updatedMarket.status);
    console.log('Winning option:', updatedMarket.winningOption);
    
  } catch (error) {
    console.error('Error resolving market:', error);
  }
}

resolveMarket(); 