// Smart Contract Automated Test Suite
const { expect } = require('chai');
const anchor = require('@project-serum/anchor');
const { SystemProgram, Keypair, PublicKey } = require('@solana/web3.js');

describe('Solana Prediction Market Smart Contract Tests', () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // Load the program
  const program = anchor.workspace.PredictionMarket;
  
  // Generate test accounts
  const platformAdmin = Keypair.generate();
  const user1 = Keypair.generate();
  const user2 = Keypair.generate();
  const marketCreator = Keypair.generate();
  
  // Test market data
  const marketData = {
    question: "Will BTC reach $100,000 by end of 2025?",
    options: ["Yes", "No"],
    endDate: new Date('2025-12-31').getTime() / 1000,
    category: "Crypto"
  };
  
  // Platform state account
  let platformStateAccount;
  // Market account
  let marketAccount;
  // Token mint
  let tokenMint;
  
  before(async () => {
    // Airdrop SOL to test accounts
    await provider.connection.requestAirdrop(platformAdmin.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);
    await provider.connection.requestAirdrop(user1.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);
    await provider.connection.requestAirdrop(user2.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);
    await provider.connection.requestAirdrop(marketCreator.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);
    
    // Wait for confirmations
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Create platform state account
    const [platformState, platformStateBump] = await PublicKey.findProgramAddress(
      [Buffer.from("platform_state")],
      program.programId
    );
    platformStateAccount = platformState;
    
    // Create token mint
    tokenMint = await createTokenMint(provider, platformAdmin);
  });
  
  describe('Platform Initialization', () => {
    it('should initialize the platform state', async () => {
      // Initialize platform
      await program.methods.initializePlatform({
        admin: platformAdmin.publicKey,
        tokenMint: tokenMint,
        betBurnRate: 250, // 2.5%
        claimBurnRate: 150, // 1.5%
        platformFee: 50, // 0.5%
      })
      .accounts({
        platformState: platformStateAccount,
        admin: platformAdmin.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([platformAdmin])
      .rpc();
      
      // Fetch and verify platform state
      const platformState = await program.account.platformState.fetch(platformStateAccount);
      expect(platformState.admin.toString()).to.equal(platformAdmin.publicKey.toString());
      expect(platformState.tokenMint.toString()).to.equal(tokenMint.toString());
      expect(platformState.betBurnRate).to.equal(250);
      expect(platformState.claimBurnRate).to.equal(150);
      expect(platformState.platformFee).to.equal(50);
      expect(platformState.paused).to.equal(false);
    });
    
    it('should allow admin to update burn rates', async () => {
      // Update burn rates
      await program.methods.updateBurnRates({
        betBurnRate: 300, // 3.0%
        claimBurnRate: 200, // 2.0%
      })
      .accounts({
        platformState: platformStateAccount,
        admin: platformAdmin.publicKey,
      })
      .signers([platformAdmin])
      .rpc();
      
      // Fetch and verify updated platform state
      const platformState = await program.account.platformState.fetch(platformStateAccount);
      expect(platformState.betBurnRate).to.equal(300);
      expect(platformState.claimBurnRate).to.equal(200);
    });
    
    it('should allow admin to pause and unpause the platform', async () => {
      // Pause platform
      await program.methods.pausePlatform()
      .accounts({
        platformState: platformStateAccount,
        admin: platformAdmin.publicKey,
      })
      .signers([platformAdmin])
      .rpc();
      
      // Verify platform is paused
      let platformState = await program.account.platformState.fetch(platformStateAccount);
      expect(platformState.paused).to.equal(true);
      
      // Unpause platform
      await program.methods.unpausePlatform()
      .accounts({
        platformState: platformStateAccount,
        admin: platformAdmin.publicKey,
      })
      .signers([platformAdmin])
      .rpc();
      
      // Verify platform is unpaused
      platformState = await program.account.platformState.fetch(platformStateAccount);
      expect(platformState.paused).to.equal(false);
    });
    
    it('should not allow non-admin to update platform settings', async () => {
      try {
        // Attempt to update burn rates as non-admin
        await program.methods.updateBurnRates({
          betBurnRate: 100,
          claimBurnRate: 100,
        })
        .accounts({
          platformState: platformStateAccount,
          admin: user1.publicKey,
        })
        .signers([user1])
        .rpc();
        
        // Should not reach here
        expect.fail("Expected error was not thrown");
      } catch (error) {
        // Verify error is about unauthorized access
        expect(error.toString()).to.include("unauthorized");
      }
    });
  });
  
  describe('Market Creation and Management', () => {
    it('should create a new market', async () => {
      // Create market account
      const marketKeypair = Keypair.generate();
      marketAccount = marketKeypair.publicKey;
      
      // Create market
      await program.methods.createMarket({
        question: marketData.question,
        options: marketData.options,
        endTimestamp: new anchor.BN(marketData.endDate),
        category: marketData.category,
        creatorStake: new anchor.BN(1000 * 1e6), // 1000 tokens
      })
      .accounts({
        market: marketAccount,
        platformState: platformStateAccount,
        creator: marketCreator.publicKey,
        tokenMint: tokenMint,
        creatorTokenAccount: await getAssociatedTokenAddress(tokenMint, marketCreator.publicKey),
        marketTokenAccount: await getAssociatedTokenAddress(tokenMint, marketAccount, true),
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([marketCreator, marketKeypair])
      .rpc();
      
      // Fetch and verify market
      const market = await program.account.market.fetch(marketAccount);
      expect(market.question).to.equal(marketData.question);
      expect(market.options).to.deep.equal(marketData.options);
      expect(market.endTimestamp.toString()).to.equal(marketData.endDate.toString());
      expect(market.category).to.equal(marketData.category);
      expect(market.creator.toString()).to.equal(marketCreator.publicKey.toString());
      expect(market.status).to.equal({ active: {} });
      expect(market.optionPools.length).to.equal(2);
      expect(market.optionPools[0].toString()).to.equal('0');
      expect(market.optionPools[1].toString()).to.equal('0');
    });
    
    it('should place predictions on a market', async () => {
      // Place prediction on "Yes" option
      await program.methods.placePrediction({
        marketId: marketAccount,
        optionIndex: 0,
        amount: new anchor.BN(500 * 1e6), // 500 tokens
      })
      .accounts({
        market: marketAccount,
        platformState: platformStateAccount,
        user: user1.publicKey,
        tokenMint: tokenMint,
        userTokenAccount: await getAssociatedTokenAddress(tokenMint, user1.publicKey),
        marketTokenAccount: await getAssociatedTokenAddress(tokenMint, marketAccount, true),
        believeAppProgram: BELIEVEAPP_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([user1])
      .rpc();
      
      // Place prediction on "No" option
      await program.methods.placePrediction({
        marketId: marketAccount,
        optionIndex: 1,
        amount: new anchor.BN(300 * 1e6), // 300 tokens
      })
      .accounts({
        market: marketAccount,
        platformState: platformStateAccount,
        user: user2.publicKey,
        tokenMint: tokenMint,
        userTokenAccount: await getAssociatedTokenAddress(tokenMint, user2.publicKey),
        marketTokenAccount: await getAssociatedTokenAddress(tokenMint, marketAccount, true),
        believeAppProgram: BELIEVEAPP_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([user2])
      .rpc();
      
      // Fetch and verify market
      const market = await program.account.market.fetch(marketAccount);
      
      // Calculate expected pool amounts after burn (2.5%)
      const expectedYesPool = 500 * 1e6 * 0.975;
      const expectedNoPool = 300 * 1e6 * 0.975;
      
      expect(market.optionPools[0].toString()).to.equal(expectedYesPool.toString());
      expect(market.optionPools[1].toString()).to.equal(expectedNoPool.toString());
      expect(market.totalPool.toString()).to.equal((expectedYesPool + expectedNoPool).toString());
    });
    
    it('should not allow predictions after market end date', async () => {
      // Create expired market
      const expiredMarketKeypair = Keypair.generate();
      const expiredMarketAccount = expiredMarketKeypair.publicKey;
      
      // Set end date to past timestamp
      const pastEndDate = Math.floor(Date.now() / 1000) - 86400; // 1 day ago
      
      // Create expired market
      await program.methods.createMarket({
        question: "Expired market question",
        options: ["Yes", "No"],
        endTimestamp: new anchor.BN(pastEndDate),
        category: "Test",
        creatorStake: new anchor.BN(100 * 1e6), // 100 tokens
      })
      .accounts({
        market: expiredMarketAccount,
        platformState: platformStateAccount,
        creator: marketCreator.publicKey,
        tokenMint: tokenMint,
        creatorTokenAccount: await getAssociatedTokenAddress(tokenMint, marketCreator.publicKey),
        marketTokenAccount: await getAssociatedTokenAddress(tokenMint, expiredMarketAccount, true),
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([marketCreator, expiredMarketKeypair])
      .rpc();
      
      try {
        // Attempt to place prediction on expired market
        await program.methods.placePrediction({
          marketId: expiredMarketAccount,
          optionIndex: 0,
          amount: new anchor.BN(100 * 1e6), // 100 tokens
        })
        .accounts({
          market: expiredMarketAccount,
          platformState: platformStateAccount,
          user: user1.publicKey,
          tokenMint: tokenMint,
          userTokenAccount: await getAssociatedTokenAddress(tokenMint, user1.publicKey),
          marketTokenAccount: await getAssociatedTokenAddress(tokenMint, expiredMarketAccount, true),
          believeAppProgram: BELIEVEAPP_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([user1])
        .rpc();
        
        // Should not reach here
        expect.fail("Expected error was not thrown");
      } catch (error) {
        // Verify error is about market being expired
        expect(error.toString()).to.include("expired");
      }
    });
    
    it('should resolve a market', async () => {
      // Resolve market with "Yes" as winner
      await program.methods.resolveMarket({
        marketId: marketAccount,
        winningOptionIndex: 0,
      })
      .accounts({
        market: marketAccount,
        platformState: platformStateAccount,
        resolver: platformAdmin.publicKey,
      })
      .signers([platformAdmin])
      .rpc();
      
      // Fetch and verify market
      const market = await program.account.market.fetch(marketAccount);
      expect(market.status).to.deep.equal({ resolved: { winningOption: 0 } });
    });
    
    it('should not allow non-admin to resolve a market', async () => {
      // Create new market for this test
      const newMarketKeypair = Keypair.generate();
      const newMarketAccount = newMarketKeypair.publicKey;
      
      // Create market
      await program.methods.createMarket({
        question: "Another test market",
        options: ["Yes", "No"],
        endTimestamp: new anchor.BN(marketData.endDate),
        category: "Test",
        creatorStake: new anchor.BN(100 * 1e6), // 100 tokens
      })
      .accounts({
        market: newMarketAccount,
        platformState: platformStateAccount,
        creator: marketCreator.publicKey,
        tokenMint: tokenMint,
        creatorTokenAccount: await getAssociatedTokenAddress(tokenMint, marketCreator.publicKey),
        marketTokenAccount: await getAssociatedTokenAddress(tokenMint, newMarketAccount, true),
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([marketCreator, newMarketKeypair])
      .rpc();
      
      try {
        // Attempt to resolve market as non-admin
        await program.methods.resolveMarket({
          marketId: newMarketAccount,
          winningOptionIndex: 0,
        })
        .accounts({
          market: newMarketAccount,
          platformState: platformStateAccount,
          resolver: user1.publicKey,
        })
        .signers([user1])
        .rpc();
        
        // Should not reach here
        expect.fail("Expected error was not thrown");
      } catch (error) {
        // Verify error is about unauthorized access
        expect(error.toString()).to.include("unauthorized");
      }
    });
  });
  
  describe('Reward Claiming', () => {
    it('should allow winners to claim rewards', async () => {
      // Get user1's token balance before claiming
      const userTokenAccountBefore = await getTokenAccount(
        provider.connection,
        await getAssociatedTokenAddress(tokenMint, user1.publicKey)
      );
      const balanceBefore = userTokenAccountBefore.amount;
      
      // Claim rewards
      await program.methods.claimReward({
        marketId: marketAccount,
      })
      .accounts({
        market: marketAccount,
        platformState: platformStateAccount,
        user: user1.publicKey,
        tokenMint: tokenMint,
        userTokenAccount: await getAssociatedTokenAddress(tokenMint, user1.publicKey),
        marketTokenAccount: await getAssociatedTokenAddress(tokenMint, marketAccount, true),
        believeAppProgram: BELIEVEAPP_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([user1])
      .rpc();
      
      // Get user1's token balance after claiming
      const userTokenAccountAfter = await getTokenAccount(
        provider.connection,
        await getAssociatedTokenAddress(tokenMint, user1.publicKey)
      );
      const balanceAfter = userTokenAccountAfter.amount;
      
      // Verify user received rewards
      expect(balanceAfter.gt(balanceBefore)).to.be.true;
      
      // Fetch market to verify claim was recorded
      const market = await program.account.market.fetch(marketAccount);
      expect(market.claimedRewards.toString()).to.not.equal('0');
    });
    
    it('should not allow losers to claim rewards', async () => {
      try {
        // Attempt to claim rewards as user2 (who bet on "No")
        await program.methods.claimReward({
          marketId: marketAccount,
        })
        .accounts({
          market: marketAccount,
          platformState: platformStateAccount,
          user: user2.publicKey,
          tokenMint: tokenMint,
          userTokenAccount: await getAssociatedTokenAddress(tokenMint, user2.publicKey),
          marketTokenAccount: await getAssociatedTokenAddress(tokenMint, marketAccount, true),
          believeAppProgram: BELIEVEAPP_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([user2])
        .rpc();
        
        // Should not reach here
        expect.fail("Expected error was not thrown");
      } catch (error) {
        // Verify error is about not being a winner
        expect(error.toString()).to.include("not a winner");
      }
    });
    
    it('should not allow double claiming of rewards', async () => {
      try {
        // Attempt to claim rewards again as user1
        await program.methods.claimReward({
          marketId: marketAccount,
        })
        .accounts({
          market: marketAccount,
          platformState: platformStateAccount,
          user: user1.publicKey,
          tokenMint: tokenMint,
          userTokenAccount: await getAssociatedTokenAddress(tokenMint, user1.publicKey),
          marketTokenAccount: await getAssociatedTokenAddress(tokenMint, marketAccount, true),
          believeAppProgram: BELIEVEAPP_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([user1])
        .rpc();
        
        // Should not reach here
        expect.fail("Expected error was not thrown");
      } catch (error) {
        // Verify error is about already claimed
        expect(error.toString()).to.include("already claimed");
      }
    });
  });
  
  describe('BelieveApp Integration', () => {
    it('should burn tokens when placing a prediction', async () => {
      // Create new market for this test
      const newMarketKeypair = Keypair.generate();
      const newMarketAccount = newMarketKeypair.publicKey;
      
      // Create market
      await program.methods.createMarket({
        question: "BelieveApp test market",
        options: ["Yes", "No"],
        endTimestamp: new anchor.BN(marketData.endDate),
        category: "Test",
        creatorStake: new anchor.BN(100 * 1e6), // 100 tokens
      })
      .accounts({
        market: newMarketAccount,
        platformState: platformStateAccount,
        creator: marketCreator.publicKey,
        tokenMint: tokenMint,
        creatorTokenAccount: await getAssociatedTokenAddress(tokenMint, marketCreator.publicKey),
        marketTokenAccount: await getAssociatedTokenAddress(tokenMint, newMarketAccount, true),
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([marketCreator, newMarketKeypair])
      .rpc();
      
      // Get user1's token balance before prediction
      const userTokenAccountBefore = await getTokenAccount(
        provider.connection,
        await getAssociatedTokenAddress(tokenMint, user1.publicKey)
      );
      const balanceBefore = userTokenAccountBefore.amount;
      
      // Place prediction
      const betAmount = new anchor.BN(200 * 1e6); // 200 tokens
      await program.methods.placePrediction({
        marketId: newMarketAccount,
        optionIndex: 0,
        amount: betAmount,
      })
      .accounts({
        market: newMarketAccount,
        platformState: platformStateAccount,
        user: user1.publicKey,
        tokenMint: tokenMint,
        userTokenAccount: await getAssociatedTokenAddress(tokenMint, user1.publicKey),
        marketTokenAccount: await getAssociatedTokenAddress(tokenMint, newMarketAccount, true),
        believeAppProgram: BELIEVEAPP_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([user1])
      .rpc();
      
      // Get user1's token balance after prediction
      const userTokenAccountAfter = await getTokenAccount(
        provider.connection,
        await getAssociatedTokenAddress(tokenMint, user1.publicKey)
      );
      const balanceAfter = userTokenAccountAfter.amount;
      
      // Verify correct amount was deducted (bet amount)
      const expectedDeduction = betAmount;
      expect(balanceBefore.sub(balanceAfter).toString()).to.equal(expectedDeduction.toString());
      
      // Fetch market to verify prediction was recorded with burn
      const market = await program.account.market.fetch(newMarketAccount);
      
      // Calculate expected pool amount after burn (2.5%)
      const expectedPoolAmount = betAmount.muln(975).divn(1000); // 97.5% of bet
      expect(market.optionPools[0].toString()).to.equal(expectedPoolAmount.toString());
    });
    
    it('should burn tokens when claiming rewards', async () => {
      // Create new market for this test
      const newMarketKeypair = Keypair.generate();
      const newMarketAccount = newMarketKeypair.publicKey;
      
      // Create market
      await program.methods.createMarket({
        question: "Reward burn test market",
        options: ["Yes", "No"],
        endTimestamp: new anchor.BN(marketData.endDate),
        category: "Test",
        creatorStake: new anchor.BN(100 * 1e6), // 100 tokens
      })
      .accounts({
        market: newMarketAccount,
        platformState: platformStateAccount,
        creator: marketCreator.publicKey,
        tokenMint: tokenMint,
        creatorTokenAccount: await getAssociatedTokenAddress(tokenMint, marketCreator.publicKey),
        marketTokenAccount: await getAssociatedTokenAddress(tokenMint, newMarketAccount, true),
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([marketCreator, newMarketKeypair])
      .rpc();
      
      // Place prediction
      const betAmount = new anchor.BN(200 * 1e6); // 200 tokens
      await program.methods.placePrediction({
        marketId: newMarketAccount,
        optionIndex: 0,
        amount: betAmount,
      })
      .accounts({
        market: newMarketAccount,
        platformState: platformStateAccount,
        user: user1.publicKey,
        tokenMint: tokenMint,
        userTokenAccount: await getAssociatedTokenAddress(tokenMint, user1.publicKey),
        marketTokenAccount: await getAssociatedTokenAddress(tokenMint, newMarketAccount, true),
        believeAppProgram: BELIEVEAPP_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([user1])
      .rpc();
      
      // Resolve market with "Yes" as winner
      await program.methods.resolveMarket({
        marketId: newMarketAccount,
        winningOptionIndex: 0,
      })
      .accounts({
        market: newMarketAccount,
        platformState: platformStateAccount,
        resolver: platformAdmin.publicKey,
      })
      .signers([platformAdmin])
      .rpc();
      
      // Get user1's token balance before claiming
      const userTokenAccountBefore = await getTokenAccount(
        provider.connection,
        await getAssociatedTokenAddress(tokenMint, user1.publicKey)
      );
      const balanceBefore = userTokenAccountBefore.amount;
      
      // Claim rewards
      await program.methods.claimReward({
        marketId: newMarketAccount,
      })
      .accounts({
        market: newMarketAccount,
        platformState: platformStateAccount,
        user: user1.publicKey,
        tokenMint: tokenMint,
        userTokenAccount: await getAssociatedTokenAddress(tokenMint, user1.publicKey),
        marketTokenAccount: await getAssociatedTokenAddress(tokenMint, newMarketAccount, true),
        believeAppProgram: BELIEVEAPP_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([user1])
      .rpc();
      
      // Get user1's token balance after claiming
      const userTokenAccountAfter = await getTokenAccount(
        provider.connection,
        await getAssociatedTokenAddress(tokenMint, user1.publicKey)
      );
      const balanceAfter = userTokenAccountAfter.amount;
      
      // Verify user received rewards
      expect(balanceAfter.gt(balanceBefore)).to.be.true;
      
      // Fetch market to verify claim was recorded with burn
      const market = await program.account.market.fetch(newMarketAccount);
      
      // Calculate expected reward amount after burn (1.5%)
      // In this case, user is the only winner, so they get the entire pool minus burn
      const totalPool = market.totalPool;
      const expectedReward = totalPool.muln(985).divn(1000); // 98.5% of pool
      
      // Verify claimed rewards matches expected
      expect(market.claimedRewards.toString()).to.equal(expectedReward.toString());
    });
  });
  
  // Helper functions
  async function createTokenMint(provider, payer) {
    // Implementation would create a token mint for testing
    // This is a placeholder
    return new PublicKey("EyovsNuwJEmKZZrnUYznDoYXYAb7frPPpLia9McQSzpU");
  }
  
  async function getAssociatedTokenAddress(mint, owner, isPDA = false) {
    // Implementation would return the associated token address
    // This is a placeholder
    return new PublicKey("3F4dEf...7Ghi");
  }
  
  async function getTokenAccount(connection, address) {
    // Implementation would fetch token account info
    // This is a placeholder
    return {
      amount: new anchor.BN(1000 * 1e6)
    };
  }
});
