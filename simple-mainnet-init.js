const { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL, SystemProgram, SYSVAR_RENT_PUBKEY } = require('@solana/web3.js');
const { AnchorProvider, BN, setProvider, workspace } = require('@coral-xyz/anchor');
const { TOKEN_PROGRAM_ID } = require('@solana/spl-token');
const fs = require('fs');

async function simpleInit() {
  console.log('🚀 Simple APES Platform Initialization');
  console.log('=====================================');

  // Load wallet
  const walletPath = './APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z.json';
  const walletKeypair = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync(walletPath, 'utf-8')))
  );

  console.log(`Wallet: ${walletKeypair.publicKey.toString()}`);

  // Connection
  const connection = new Connection('https://mainnet.helius-rpc.com/?api-key=4a7d2ddd-3e83-4265-a9fb-0e4a5b51fd6d', 'confirmed');
  
  const balance = await connection.getBalance(walletKeypair.publicKey);
  console.log(`Balance: ${balance / LAMPORTS_PER_SOL} SOL`);

  // Program configuration
  const programId = new PublicKey('APESCaeLW5RuxNnpNARtDZnSgeVFC5f37Z3VFNKupJUS');
  const tokenMint = new PublicKey('9BZJXtmfPpkHnM57gHEx5Pc9oQhLhJtr4mhCsNtttTts');
  const treasury = new PublicKey('APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z');

  // Find platform state PDA
  const [platformState] = PublicKey.findProgramAddressSync(
    [Buffer.from('platform_state')],
    programId
  );

  console.log(`Platform State PDA: ${platformState.toString()}`);

  // Check if platform state already exists
  try {
    const accountInfo = await connection.getAccountInfo(platformState);
    if (accountInfo && accountInfo.data.length > 0) {
      console.log('✅ Platform State already exists!');
      console.log(`   Data length: ${accountInfo.data.length} bytes`);
      console.log(`   Owner: ${accountInfo.owner.toString()}`);
      console.log('🎉 APES Platform is already initialized on mainnet!');
      
      // Let's decode some basic info
      const data = accountInfo.data;
      if (data.length >= 32) {
        const authority = new PublicKey(data.slice(8, 40)); // Skip discriminator
        console.log(`   Authority: ${authority.toString()}`);
      }
      return;
    } else {
      console.log('📝 Platform State not found, needs initialization');
    }
  } catch (error) {
    console.log('📝 Platform State account doesn\'t exist yet');
  }

  // Try direct program call using instruction data
  console.log('🔄 Creating initialize instruction manually...');
  
  // For now, let's just verify that our program exists and is accessible
  try {
    const programAccount = await connection.getAccountInfo(programId);
    if (programAccount && programAccount.executable) {
      console.log('✅ Program is deployed and executable');
      console.log(`   Program data length: ${programAccount.data.length} bytes`);
      console.log(`   Program owner: ${programAccount.owner.toString()}`);
    } else {
      console.error('❌ Program account not found or not executable');
      return;
    }
  } catch (error) {
    console.error('❌ Error checking program:', error.message);
    return;
  }

  console.log('\n⚠️  Manual initialization needed');
  console.log('The program is deployed but requires manual initialization.');
  console.log('Please use the Anchor CLI or a frontend interface to initialize.');
  console.log('\n🔗 Program Details:');
  console.log(`   Program ID: ${programId.toString()}`);
  console.log(`   View on Solscan: https://solscan.io/account/${programId.toString()}`);
}

simpleInit().catch(console.error); 