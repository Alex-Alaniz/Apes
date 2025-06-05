import * as anchor from "@project-serum/anchor";

describe("initialize access control", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.MarketSystem as anchor.Program<any>;

  it("Initializes the AccessControl account", async () => {
    const [accessControlPda] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("access_control")],
      program.programId
    );
    try {
      await program.methods.initializeAccessControl().accounts({
        accessControl: accessControlPda,
        admin: program.provider.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      }).rpc();
      console.log("✅ AccessControl initialized at", accessControlPda.toBase58());
    } catch (e) {
      if (e.message && e.message.includes("already in use")) {
        console.log("AccessControl already exists at", accessControlPda.toBase58());
      } else {
        throw e;
      }
    }
  });
}); 