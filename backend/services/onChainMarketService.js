/**
 * On-chain Market Service
 * Handles creating markets on Solana blockchain for livestream predictions
 */

const { Connection, PublicKey, Keypair, Transaction } = require('@solana/web3.js');
const { Program, AnchorProvider, BN, setProvider } = require('@coral-xyz/anchor');
const { TOKEN_PROGRAM_ID } = require('@solana/spl-token');
const bs58 = require('bs58');
const db = require('../database/db');

// Import IDL
const IDL = require('../../src/frontend/src/idl/market_prediction_game.json');

// Configuration
const PROGRAM_ID = new PublicKey('APESCaeLW5RuxNnpNARtDZnSgeVFC5f37Z3VFNKupJUS');
const TOKEN_MINT = new PublicKey('9BZJXtmfPpkHnM57gHEx5Pc9oQhLhJtr4mhCsNtttTts'); // APES token
const PLATFORM_FEE_ADDRESS = new PublicKey('D6q6wCYpFAEzqPBP52JnBSUNqNpfPCCqxQfLz6bKNYoP');
const TREASURY_ADDRESS = new PublicKey('APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z');

class OnChainMarketService {
  constructor() {
    this.connection = null;
    this.program = null;
    this.adminWallet = null;
    this.provider = null;
  }

  /**
   * Initialize the service
   */
  async initialize() {
    try {
      // Initialize connection
      this.connection = new Connection(
        process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
        'confirmed'
      );

      // Initialize admin wallet from private key
      if (!process.env.ADMIN_PRIVATE_KEY) {
        console.warn('⚠️ ADMIN_PRIVATE_KEY not set, on-chain market creation disabled');
        return;
      }

      try {
        const adminPrivateKey = bs58.decode(process.env.ADMIN_PRIVATE_KEY);
        this.adminWallet = Keypair.fromSecretKey(adminPrivateKey);
        console.log('✅ Admin wallet initialized:', this.adminWallet.publicKey.toString());
      } catch (error) {
        console.error('❌ Failed to initialize admin wallet:', error.message);
        return;
      }

      // Create provider
      this.provider = new AnchorProvider(
        this.connection,
        {
          publicKey: this.adminWallet.publicKey,
          signTransaction: async (tx) => {
            tx.sign(this.adminWallet);
            return tx;
          },
          signAllTransactions: async (txs) => {
            return txs.map(tx => {
              tx.sign(this.adminWallet);
              return tx;
            });
          }
        },
        { commitment: 'confirmed' }
      );

      setProvider(this.provider);

      // Initialize program
      this.program = new Program(IDL, PROGRAM_ID, this.provider);

      console.log('✅ On-chain market service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize on-chain market service:', error);
    }
  }

  /**
   * Create a market on-chain
   */
  async createMarket(marketData) {
    if (!this.program || !this.adminWallet) {
      console.warn('On-chain market creation not available');
      return null;
    }

    const {
      question,
      options = ['Yes', 'No'],
      duration = 5, // minutes
      creatorStake = 100 // APES
    } = marketData;

    try {
      console.log('🚀 Creating on-chain market:', { question, options, duration });

      // Generate new market keypair
      const market = Keypair.generate();

      // Calculate resolution date (current time + duration)
      const resolutionDate = new BN(Math.floor((Date.now() + duration * 60 * 1000) / 1000));

      // Find PDAs
      const [platformState] = PublicKey.findProgramAddressSync(
        [Buffer.from('platform_state')],
        this.program.programId
      );

      const [accessControl] = PublicKey.findProgramAddressSync(
        [Buffer.from('access_control')],
        this.program.programId
      );

      const [marketEscrow] = PublicKey.findProgramAddressSync(
        [Buffer.from('market_escrow'), market.publicKey.toBuffer()],
        this.program.programId
      );

      // Convert amounts to BN with proper decimals (9 for APES)
      const creatorFeeRate = new BN(200); // 2%
      const minBetAmount = new BN(1 * 1e9); // 1 APES
      const stakeAmount = new BN(creatorStake * 1e9); // Creator stake in lamports

      // Convert strings to fixed-size byte arrays
      const stringToBytes = (str, maxLength) => {
        const bytes = new Uint8Array(maxLength);
        const encoded = new TextEncoder().encode(str.substring(0, maxLength));
        bytes.set(encoded);
        return Array.from(bytes);
      };

      const questionBytes = stringToBytes(question, 200);
      const questionLen = Math.min(question.length, 200);
      const option1Bytes = stringToBytes(options[0] || 'Yes', 50);
      const option2Bytes = stringToBytes(options[1] || 'No', 50);
      const option3Bytes = stringToBytes('', 50);
      const option4Bytes = stringToBytes('', 50);
      const categoryBytes = stringToBytes('Livestream', 20);

      // Get admin token account
      const [adminTokenAccount] = PublicKey.findProgramAddressSync(
        [
          this.adminWallet.publicKey.toBuffer(),
          TOKEN_PROGRAM_ID.toBuffer(),
          TOKEN_MINT.toBuffer(),
        ],
        new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL')
      );

      // Create market instruction
      const createMarketIx = await this.program.methods
        .createMarket(
          { binary: {} }, // Market type
          questionBytes,
          questionLen,
          option1Bytes,
          option2Bytes,
          option3Bytes,
          option4Bytes,
          2, // option count
          resolutionDate,
          creatorFeeRate,
          minBetAmount,
          stakeAmount,
          categoryBytes
        )
        .accounts({
          market: market.publicKey,
          platformState,
          accessControl,
          creator: this.adminWallet.publicKey,
          marketEscrow,
          creatorTokenAccount: adminTokenAccount,
          tokenMint: TOKEN_MINT,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: PublicKey.default,
          rent: PublicKey.default,
        })
        .instruction();

      // Create and send transaction
      const tx = new Transaction().add(createMarketIx);
      
      // Get recent blockhash
      const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = this.adminWallet.publicKey;

      // Sign with market keypair and admin
      tx.sign(market, this.adminWallet);

      // Send transaction
      const signature = await this.connection.sendRawTransaction(tx.serialize());
      
      // Confirm transaction
      await this.connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight
      });

      console.log('✅ Market created on-chain:', {
        marketAddress: market.publicKey.toString(),
        txSignature: signature
      });

      return {
        marketAddress: market.publicKey.toString(),
        txSignature: signature,
        resolutionDate: resolutionDate.toNumber()
      };

    } catch (error) {
      console.error('❌ Failed to create on-chain market:', error);
      return null;
    }
  }

  /**
   * Check if service is ready
   */
  isReady() {
    return this.program !== null && this.adminWallet !== null;
  }
}

module.exports = new OnChainMarketService();