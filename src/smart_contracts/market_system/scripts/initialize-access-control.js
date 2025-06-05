const anchor = require('@project-serum/anchor');
const { PublicKey, Keypair } = require('@solana/web3.js');
const fs = require('fs');

// === CONFIG ===
const PROGRAM_ID = new PublicKey('FGRM6t7tzY9FtFdjq5W9tdwNAkXfZCX1aEMvysdJipib');
const IDL = require('../../../frontend/src/idl/market_system.json');
const WALLET_PATH = './APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z.json';
const NETWORK = 'https://api.devnet.solana.com';

function loadWalletKey(keypairPath) {
  return Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync(keypairPath, 'utf8')))
  );
}

(async () => {
  const wallet = loadWalletKey(WALLET_PATH);
  const provider = new anchor.AnchorProvider(
    new anchor.web3.Connection(NETWORK, 'confirmed'),
    new anchor.Wallet(wallet),
    { preflightCommitment: 'confirmed' }
  );
  anchor.setProvider(provider);
  const program = new anchor.Program(IDL, PROGRAM_ID, provider);

  // Derive PDA for AccessControl
  const [accessControlPda] = await PublicKey.findProgramAddress(
    [Buffer.from('access_control')],
    PROGRAM_ID
  );

  // Check if account already exists
  const accountInfo = await provider.connection.getAccountInfo(accessControlPda);
  if (accountInfo) {
    console.log('AccessControl account already exists at:', accessControlPda.toBase58());
    process.exit(0);
  }

  try {
    const tx = await program.methods.initializeAccessControl()
      .accounts({
        accessControl: accessControlPda,
        admin: wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([wallet])
      .rpc();
    console.log('✅ AccessControl initialized! Tx:', tx);
    console.log('AccessControl PDA:', accessControlPda.toBase58());
  } catch (err) {
    console.error('Error initializing AccessControl:', err);
    process.exit(1);
  }
})(); 