const { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const { Program, AnchorProvider, web3, BN } = require('@project-serum/anchor');
const { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } = require('@solana/spl-token');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Load configuration
const config = require('../../src/config/networks.json');
const idl = require('../../src/smart_contracts/market_system/target/idl/market_system.json');

const NETWORK = 'devnet';
const networkConfig = config[NETWORK];

describe('Market Flow Integration Tests', () => {
  let connection;
  let provider;
  let program;
  let walletKeypair;
  let marketKeypair;
  let platformState;

  before(async () => {
    // Setup connection
    connection = new Connection(networkConfig.rpcUrl, 'confirmed');

    // Load wallet
    const walletPath = path.join(process.env.HOME, '.config/solana/id.json');
    walletKeypair = Keypair.fromSecretKey(
      Buffer.from(JSON.parse(fs.readFileSync(walletPath, 'utf-8')))
    );

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

    provider = new AnchorProvider(connection, wallet, {
      commitment: 'confirmed',
    });

    // Create program
    const programId = new PublicKey(networkConfig.programId);
    program = new Program(idl, programId, provider);

    // Derive platform state
    [platformState] = await PublicKey.findProgramAddress(
      [Buffer.from('platform_state')],
      program.programId
    );
  });

  describe('Platform Initialization', () => {
    it('should verify platform is initialized', async () => {
      try {
        const state = await program.account.platformState.fetch(platformState);
        assert(state.authority.equals(walletKeypair.publicKey), 'Invalid authority');
        assert(state.tokenMint.equals(new PublicKey(networkConfig.tokenMint)), 'Invalid token mint');
        assert.equal(state.betBurnRate.toNumber(), 250, 'Invalid bet burn rate');
        assert.equal(state.claimBurnRate.toNumber(), 150, 'Invalid claim burn rate');
        assert.equal(state.platformFeeRate.toNumber(), 100, 'Invalid platform fee rate');
        console.log('✅ Platform initialized correctly');
      } catch (error) {
        console.error('❌ Platform not initialized:', error.message);
        throw error;
      }
    });
  });

  describe('Market Creation', () => {
    it('should create a new prediction market', async () => {
      marketKeypair = web3.Keypair.generate();
      
      const [marketEscrow] = await PublicKey.findProgramAddress(
        [Buffer.from('market_escrow'), marketKeypair.publicKey.toBuffer()],
        program.programId
      );

      const creatorTokenAccount = await getAssociatedTokenAddress(
        new PublicKey(networkConfig.tokenMint),
        walletKeypair.publicKey
      );

      const burnTokenAccount = await getAssociatedTokenAddress(
        new PublicKey(networkConfig.tokenMint),
        new PublicKey('11111111111111111111111111111111')
      );

      const marketId = `test-market-${Date.now()}`;
      const question = 'Will BTC reach $100k by end of 2024?';
      const options = ['Yes', 'No'];
      const resolutionDate = Math.floor(Date.now() / 1000) + 86400 * 30; // 30 days from now
      const creatorFeeRate = 100; // 1%
      const minBetAmount = 1_000_000; // 1 APES
      const creatorStakeAmount = 100_000_000; // 100 APES

      try {
        const tx = await program.methods
          .createMarket(
            { binary: {} },
            question,
            options,
            new BN(resolutionDate),
            new BN(creatorFeeRate),
            new BN(minBetAmount),
            marketId,
            new BN(creatorStakeAmount)
          )
          .accounts({
            market: marketKeypair.publicKey,
            platformState,
            creator: walletKeypair.publicKey,
            creatorTokenAccount,
            marketEscrow,
            burnTokenAccount,
            tokenMint: new PublicKey(networkConfig.tokenMint),
            systemProgram: web3.SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            rent: web3.SYSVAR_RENT_PUBKEY,
          })
          .signers([marketKeypair])
          .rpc();

        console.log('✅ Market created:', marketKeypair.publicKey.toString());
        console.log('   Transaction:', tx);

        // Verify market data
        const market = await program.account.market.fetch(marketKeypair.publicKey);
        assert.equal(market.question, question, 'Invalid question');
        assert.equal(market.options.length, 2, 'Invalid options count');
        assert.equal(market.status.active !== undefined, true, 'Market not active');
        
      } catch (error) {
        console.error('❌ Failed to create market:', error);
        throw error;
      }
    });
  });

  describe('Placing Predictions', () => {
    it('should place a prediction on the market', async () => {
      const [marketEscrow] = await PublicKey.findProgramAddress(
        [Buffer.from('market_escrow'), marketKeypair.publicKey.toBuffer()],
        program.programId
      );

      const [prediction] = await PublicKey.findProgramAddress(
        [
          Buffer.from('prediction'),
          marketKeypair.publicKey.toBuffer(),
          walletKeypair.publicKey.toBuffer()
        ],
        program.programId
      );

      const userTokenAccount = await getAssociatedTokenAddress(
        new PublicKey(networkConfig.tokenMint),
        walletKeypair.publicKey
      );

      const burnTokenAccount = await getAssociatedTokenAddress(
        new PublicKey(networkConfig.tokenMint),
        new PublicKey('11111111111111111111111111111111')
      );

      const treasuryTokenAccount = await getAssociatedTokenAddress(
        new PublicKey(networkConfig.tokenMint),
        walletKeypair.publicKey
      );

      const optionIndex = 0; // Bet on "Yes"
      const amount = 50_000_000; // 50 APES

      try {
        const tx = await program.methods
          .placePrediction(
            optionIndex,
            new BN(amount)
          )
          .accounts({
            market: marketKeypair.publicKey,
            platformState,
            user: walletKeypair.publicKey,
            userTokenAccount,
            marketEscrow,
            burnTokenAccount,
            treasuryTokenAccount,
            prediction,
            systemProgram: web3.SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            rent: web3.SYSVAR_RENT_PUBKEY,
          })
          .rpc();

        console.log('✅ Prediction placed successfully');
        console.log('   Transaction:', tx);

        // Verify prediction
        const predictionData = await program.account.prediction.fetch(prediction);
        assert.equal(predictionData.optionIndex, optionIndex, 'Invalid option index');
        assert(predictionData.amount.gt(new BN(0)), 'Invalid amount');
        assert.equal(predictionData.claimed, false, 'Should not be claimed');

        // Verify market pool updated
        const market = await program.account.market.fetch(marketKeypair.publicKey);
        assert(market.totalPool.gt(new BN(0)), 'Pool not updated');
        assert(market.optionPools[optionIndex].gt(new BN(0)), 'Option pool not updated');

      } catch (error) {
        console.error('❌ Failed to place prediction:', error);
        throw error;
      }
    });
  });

  describe('Market Resolution', () => {
    it('should resolve the market', async () => {
      const winningOption = 0; // "Yes" wins

      try {
        const tx = await program.methods
          .resolveMarket(winningOption)
          .accounts({
            market: marketKeypair.publicKey,
            resolver: walletKeypair.publicKey,
          })
          .rpc();

        console.log('✅ Market resolved successfully');
        console.log('   Transaction:', tx);

        // Verify resolution
        const market = await program.account.market.fetch(marketKeypair.publicKey);
        assert.equal(market.status.resolved !== undefined, true, 'Market not resolved');
        assert.equal(market.winningOption, winningOption, 'Invalid winning option');

      } catch (error) {
        console.error('❌ Failed to resolve market:', error);
        throw error;
      }
    });
  });

  describe('Claiming Rewards', () => {
    it('should claim rewards for winning prediction', async () => {
      const [marketEscrow] = await PublicKey.findProgramAddress(
        [Buffer.from('market_escrow'), marketKeypair.publicKey.toBuffer()],
        program.programId
      );

      const [prediction] = await PublicKey.findProgramAddress(
        [
          Buffer.from('prediction'),
          marketKeypair.publicKey.toBuffer(),
          walletKeypair.publicKey.toBuffer()
        ],
        program.programId
      );

      const userTokenAccount = await getAssociatedTokenAddress(
        new PublicKey(networkConfig.tokenMint),
        walletKeypair.publicKey
      );

      const market = await program.account.market.fetch(marketKeypair.publicKey);
      
      const creatorTokenAccount = await getAssociatedTokenAddress(
        new PublicKey(networkConfig.tokenMint),
        market.creator
      );

      const burnTokenAccount = await getAssociatedTokenAddress(
        new PublicKey(networkConfig.tokenMint),
        new PublicKey('11111111111111111111111111111111')
      );

      try {
        const tx = await program.methods
          .claimReward()
          .accounts({
            market: marketKeypair.publicKey,
            platformState,
            prediction,
            user: walletKeypair.publicKey,
            userTokenAccount,
            marketEscrow,
            creatorTokenAccount,
            burnTokenAccount,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .rpc();

        console.log('✅ Reward claimed successfully');
        console.log('   Transaction:', tx);

        // Verify claim
        const predictionData = await program.account.prediction.fetch(prediction);
        assert.equal(predictionData.claimed, true, 'Reward not marked as claimed');

      } catch (error) {
        console.error('❌ Failed to claim reward:', error);
        throw error;
      }
    });
  });

  describe('Edge Cases', () => {
    it('should prevent double claiming', async () => {
      const [prediction] = await PublicKey.findProgramAddress(
        [
          Buffer.from('prediction'),
          marketKeypair.publicKey.toBuffer(),
          walletKeypair.publicKey.toBuffer()
        ],
        program.programId
      );

      try {
        await program.methods
          .claimReward()
          .accounts({
            market: marketKeypair.publicKey,
            platformState,
            prediction,
            user: walletKeypair.publicKey,
            // ... other accounts
          })
          .rpc();

        assert.fail('Should not allow double claiming');
      } catch (error) {
        assert(error.toString().includes('AlreadyClaimed'), 'Wrong error type');
        console.log('✅ Double claiming prevented correctly');
      }
    });

    it('should prevent betting on resolved markets', async () => {
      try {
        await program.methods
          .placePrediction(0, new BN(1_000_000))
          .accounts({
            market: marketKeypair.publicKey,
            // ... other accounts
          })
          .rpc();

        assert.fail('Should not allow betting on resolved market');
      } catch (error) {
        assert(error.toString().includes('MarketNotActive'), 'Wrong error type');
        console.log('✅ Betting on resolved market prevented correctly');
      }
    });
  });
});

// Run tests
if (require.main === module) {
  console.log('Running integration tests...\n');
  require('mocha/lib/cli/cli').main(['--timeout', '30000']);
} 