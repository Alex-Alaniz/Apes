import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { MarketSystem } from "../target/types/market_system";
import { PublicKey } from "@solana/web3.js";

describe("Initialize Platform", () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.MarketSystem as Program<MarketSystem>;
  const TOKEN_MINT = new PublicKey("9BZJXtmfPpkHnM57gHEx5Pc9oQhLhJtr4mhCsNtttTts");

  it("Initializes access control", async () => {
    const [accessControl] = PublicKey.findProgramAddressSync(
      [Buffer.from("access_control")],
      program.programId
    );

    try {
      const tx = await program.methods
        .initializeAccessControl()
        .accounts({
          accessControl,
          admin: provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      
      console.log("✅ Access Control initialized:", tx);
    } catch (e) {
      console.log("Access control might already be initialized:", e.message);
    }
  });

  it("Initializes platform state", async () => {
    const [platformState] = PublicKey.findProgramAddressSync(
      [Buffer.from("platform_state")],
      program.programId
    );

    try {
      const tx = await program.methods
        .initialize(
          new anchor.BN(50), // bet_burn_rate: 0.5%
          new anchor.BN(50), // claim_burn_rate: 0.5%
          new anchor.BN(100) // platform_fee_rate: 1%
        )
        .accounts({
          platformState,
          authority: provider.wallet.publicKey,
          tokenMint: TOKEN_MINT,
          treasury: provider.wallet.publicKey, // Using admin as treasury for testing
          systemProgram: anchor.web3.SystemProgram.programId,
          tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .rpc();
      
      console.log("✅ Platform State initialized:", tx);
    } catch (e) {
      console.log("Platform might already be initialized:", e.message);
    }
  });
}); 