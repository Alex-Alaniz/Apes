// Migrations are an early feature. Currently, they're nothing more than this
// single deploy script that's invoked from the CLI, injecting a provider
// configured from the workspace's Anchor.toml.

import * as anchor from "@coral-xyz/anchor";

module.exports = async function (provider: anchor.AnchorProvider) {
  // Configure client to use the provider.
  anchor.setProvider(provider);

  console.log("🚀 Initializing APES Platform on Mainnet...");
  
  const program = anchor.workspace.MarketSystem;
  
  // APES Configuration for Mainnet
  const tokenMint = new anchor.web3.PublicKey("9BZJXtmfPpkHnM57gHEx5Pc9oQhLhJtr4mhCsNtttTts");
  const treasury = new anchor.web3.PublicKey("APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z");
  
  // Find platform state PDA
  const [platformState] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("platform_state")],
    program.programId
  );
  
  console.log(`Platform State PDA: ${platformState.toString()}`);
  
  // Check if already initialized
  try {
    const existingState = await program.account.platformState.fetch(platformState);
    console.log("✅ Platform already initialized!");
    console.log(`   Authority: ${existingState.authority.toString()}`);
    console.log(`   Treasury: ${existingState.treasury.toString()}`);
    return;
  } catch (error) {
    console.log("📝 Initializing platform state...");
  }
  
  try {
    // Initialize platform with explicit commitment settings
    const tx = await program.methods
      .initialize(
        new anchor.BN(250), // 2.5% bet burn rate
        new anchor.BN(150), // 1.5% claim burn rate  
        new anchor.BN(100)  // 1% platform fee
      )
      .accounts({
        platformState,
        authority: provider.wallet.publicKey,
        tokenMint,
        treasury,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc({
        commitment: 'confirmed',
        preflightCommitment: 'confirmed',
        skipPreflight: false
      });

    console.log("✅ Platform initialized successfully!");
    console.log(`   Transaction: ${tx}`);
    console.log(`   View on Solscan: https://solscan.io/tx/${tx}`);
    
    // Verify initialization
    const state = await program.account.platformState.fetch(platformState);
    console.log("📊 Platform Configuration:");
    console.log(`   Authority: ${state.authority.toString()}`);
    console.log(`   Token Mint: ${state.tokenMint.toString()}`);
    console.log(`   Treasury: ${state.treasury.toString()}`);
    console.log(`   Bet Burn Rate: ${state.betBurnRate} basis points (2.5%)`);
    console.log(`   Claim Burn Rate: ${state.claimBurnRate} basis points (1.5%)`);
    console.log(`   Platform Fee Rate: ${state.platformFeeRate} basis points (1%)`);
    
  } catch (error) {
    console.error("❌ Platform initialization failed:", error);
    throw error;
  }
};
