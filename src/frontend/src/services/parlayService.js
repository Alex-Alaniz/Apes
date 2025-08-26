import { Connection, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
const APES_TOKEN_MINT = new PublicKey(import.meta.env.VITE_TOKEN_MINT || '9BZJXtmfPpkHnM57gHEx5Pc9oQhLhJtr4mhCsNtttTts');
const TREASURY_ADDRESS = new PublicKey(import.meta.env.VITE_TREASURY || 'APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z');
const MARKET_SYSTEM_PROGRAM_ID = new PublicKey('APESCaeLW5RuxNnpNARtDZnSgeVFC5f37Z3VFNKupJUS');

// Use the treasury wallet for parlay escrow
const PARLAY_ESCROW_WALLET = TREASURY_ADDRESS;

console.log('Parlay Escrow (Treasury):', PARLAY_ESCROW_WALLET.toString());

class ParlayService {
  constructor() {
    this.connection = null;
    this.wallet = null;
  }

  async initialize(connection, wallet) {
    console.log('ParlayService: Initializing with wallet', wallet?.publicKey?.toString());
    
    if (!wallet || !wallet.publicKey) {
      throw new Error('Wallet is required to initialize ParlayService');
    }
    
    // Store connection and wallet (database-only implementation)
    this.connection = connection;
    this.wallet = wallet;
    
    console.log('ParlayService: Initialized successfully for database-only mode');
  }


  async placeParlayBet(wallet, tournamentId, selections, stakeAmount) {
    try {
      if (!wallet.publicKey) {
        throw new Error('Please connect your wallet first');
      }

      // Validate selections first
      if (selections.length < 2) {
        throw new Error('Minimum 2 selections required for parlay bet');
      }

      console.log('ParlayService: Placing parlay bet with wallet:', wallet.publicKey.toString());

      // Check if user is trying to send to themselves (common during testing)
      if (wallet.publicKey.toString() === TREASURY_ADDRESS.toString()) {
        throw new Error('Cannot place bet: your wallet is the treasury wallet. Please use a different wallet for betting.');
      }

      // Calculate potential payout using tournament settings
      const multiplier = this.calculateParlayOdds(selections, { 
        base_multiplier: 1.8, 
        multiplier_increment: 0.5 
      });
      const potentialPayout = stakeAmount * multiplier;

      // Generate bet ID
      const betId = `bet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create APES token transfer transaction using same pattern as regular market betting
      const { 
        getAssociatedTokenAddress, 
        createAssociatedTokenAccountInstruction,
        createTransferInstruction,
        ASSOCIATED_TOKEN_PROGRAM_ID 
      } = await import('@solana/spl-token');

      // Get user's APES token account
      const userTokenAccount = await getAssociatedTokenAddress(
        APES_TOKEN_MINT,
        wallet.publicKey
      );

      // Get parlay escrow APES token account  
      // This is where bet funds will be held until winners are paid
      const escrowTokenAccount = await getAssociatedTokenAddress(
        APES_TOKEN_MINT,
        PARLAY_ESCROW_WALLET
      );

      // Check user's APES balance
      try {
        const accountInfo = await this.connection.getAccountInfo(userTokenAccount);
        if (!accountInfo) {
          throw new Error('APES token account not found. Please ensure you have APES tokens in your wallet.');
        }
        
        const tokenAccountInfo = await this.connection.getTokenAccountBalance(userTokenAccount);
        const userBalance = tokenAccountInfo.value.uiAmount || 0;
        
        if (userBalance < stakeAmount) {
          throw new Error(`Insufficient APES balance. You have ${userBalance} APES but need ${stakeAmount} APES for this bet.`);
        }
        
        console.log(`✅ User APES balance verified: ${userBalance} APES`);
      } catch (error) {
        if (error.message.includes('could not find account')) {
          throw new Error('No APES token account found. Please ensure you have APES tokens in your wallet.');
        }
        if (!error.message.includes('Insufficient APES balance')) {
          console.warn('Could not check balance:', error);
        } else {
          throw error;
        }
      }

      // Create transaction with proper structure for wallet recognition
      const transaction = new Transaction();

      // Check if escrow token account exists, create if needed
      // This helps wallets understand the full transaction context
      try {
        const escrowAccountInfo = await this.connection.getAccountInfo(escrowTokenAccount);
        if (!escrowAccountInfo) {
          console.log('Creating parlay escrow token account...');
          const createATAInstruction = createAssociatedTokenAccountInstruction(
            wallet.publicKey,      // payer
            escrowTokenAccount,    // ata
            PARLAY_ESCROW_WALLET, // owner (the escrow wallet)
            APES_TOKEN_MINT,      // mint
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
          );
          transaction.add(createATAInstruction);
        }
      } catch (e) {
        console.log('Escrow account check:', e.message);
      }

      // Convert stake amount to token units (APES has 6 decimals)
      const transferAmount = Math.floor(stakeAmount * 1_000_000);

      console.log(`Creating APES transfer: ${stakeAmount} APES (${transferAmount} base units)`);
      console.log(`User wallet: ${wallet.publicKey.toString()}`);
      console.log(`User token account: ${userTokenAccount.toString()}`);
      console.log(`Treasury wallet: ${PARLAY_ESCROW_WALLET.toString()}`);
      console.log(`Treasury token account: ${escrowTokenAccount.toString()}`);
      console.log(`Token Mint: ${APES_TOKEN_MINT.toString()}`);
      
      // Verify accounts are different
      if (userTokenAccount.toString() === escrowTokenAccount.toString()) {
        console.error('ERROR: User and treasury token accounts are the same!');
        console.error('This will result in no balance change.');
      }

      // Create the SPL token transfer instruction
      const transferInstruction = createTransferInstruction(
        userTokenAccount,      // source account
        escrowTokenAccount,    // destination account (escrow)  
        wallet.publicKey,      // owner of source account
        transferAmount,        // amount in smallest units
        [],                   // multisig signers
        TOKEN_PROGRAM_ID      // token program
      );

      transaction.add(transferInstruction);
      
      // Add a compute budget instruction to help wallet recognize the transaction
      const ComputeBudgetProgram = {
        programId: new PublicKey('ComputeBudget111111111111111111111111111111'),
        setComputeUnitLimit: (units) => ({
          keys: [],
          programId: new PublicKey('ComputeBudget111111111111111111111111111111'),
          data: Buffer.concat([
            Buffer.from([2]), // SetComputeUnitLimit instruction
            Buffer.from(new Uint32Array([units]).buffer)
          ])
        })
      };
      
      // Add compute budget to help wallet recognize this as a complex transaction
      transaction.add(ComputeBudgetProgram.setComputeUnitLimit(200000));
      
      // Add a memo instruction with detailed information
      const memoProgram = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
      const memoText = `CS2 Parlay: ${stakeAmount} APES to Treasury`;
      const memoInstruction = {
        keys: [{ pubkey: wallet.publicKey, isSigner: true, isWritable: false }],
        programId: memoProgram,
        data: Buffer.from(memoText, 'utf8')
      };
      transaction.add(memoInstruction);
      
      // Get recent blockhash and set transaction metadata
      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = wallet.publicKey;

      console.log('ParlayService: Transaction prepared, sending...');

      // For SPL token transfers without Anchor programs, we use sendTransaction
      // This is the standard wallet adapter method for direct token transfers
      const signature = await wallet.sendTransaction(transaction, this.connection, {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
        maxRetries: 3
      });

      console.log('ParlayService: Transaction sent:', signature);
      
      // Confirm transaction using same pattern as market service
      try {
        await this.confirmTransaction(signature);
        console.log('Parlay bet placed successfully:', signature);

        // Record bet in backend database
        const response = await axios.post(
          `${API_URL}/api/parlay-tournaments/${tournamentId}/bet`,
          {
            userAddress: wallet.publicKey.toString(),
            selections,
            stakeAmount,
            potentialPayout,
            transactionSignature: signature,
            betId,
            multiplier,
            burnAmount: Math.floor(stakeAmount * 0.025),
            claimBurnAmount: Math.floor(potentialPayout * 0.015),
            netPayout: potentialPayout - Math.floor(potentialPayout * 0.015),
            implementationType: 'database'
          }
        );

        return {
          success: true,
          signature,
          betId: response.data.betId || betId,
          potentialPayout: response.data.potentialPayout || potentialPayout,
          multiplier,
          burnAmount: Math.floor(stakeAmount * 0.025),
          netPayout: potentialPayout - Math.floor(potentialPayout * 0.015),
          stakeAmount,
          selections: selections.length,
          isReal: true
        };

      } catch (confirmError) {
        console.warn('Transaction confirmation timeout, but bet may have succeeded:', signature);
        return { 
          success: true, 
          signature,
          betId,
          warning: 'Transaction sent but confirmation timed out. Please check your wallet for the result.',
          potentialPayout,
          multiplier,
          stakeAmount,
          selections: selections.length
        };
      }

    } catch (error) {
      console.error('Error placing parlay bet:', error);
      
      // Provide user-friendly error messages
      if (error.message.includes('User rejected')) {
        throw new Error('Transaction was cancelled by user');
      } else if (error.message.includes('insufficient funds')) {
        throw new Error(`Insufficient APES tokens. You need ${stakeAmount} APES to place this bet.`);
      } else if (error.message.includes('Account not found')) {
        throw new Error('APES token account not found. Please make sure you have APES tokens in your wallet.');
      } else if (error.message.includes('Access forbidden')) {
        throw new Error('Network connection issue. Please try again in a moment.');
      } else {
        throw new Error(error.message || 'Failed to place bet. Please try again.');
      }
    }
  }

  // Transaction confirmation method (same as market service)
  async confirmTransaction(signature, commitment = 'confirmed', maxRetries = 5) {
    console.log(`🔄 Confirming transaction: ${signature}`);
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        console.log(`📡 Confirmation attempt ${i + 1}/${maxRetries}...`);
        const confirmation = await this.connection.confirmTransaction(signature, commitment);
        
        if (confirmation.value.err) {
          throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
        }
        
        console.log('✅ Transaction confirmed successfully');
        return confirmation;
      } catch (error) {
        console.log(`❌ Confirmation attempt ${i + 1} failed:`, error.message);
        
        // Check if transaction actually succeeded despite timeout
        try {
          console.log('🔍 Checking transaction status via getSignatureStatus...');
          const status = await this.connection.getSignatureStatus(signature);
          console.log('📊 Transaction status:', status);
          
          if (status.value?.confirmationStatus === 'confirmed' || 
              status.value?.confirmationStatus === 'finalized') {
            console.log('✅ Transaction actually succeeded despite timeout');
            return { value: { err: null } };
          }
          
          if (status.value?.confirmationStatus === 'processed') {
            console.log('⏳ Transaction processed but waiting for confirmation...');
            // Continue to retry
          }
        } catch (statusError) {
          console.error('❌ Error checking transaction status:', statusError);
        }
        
        // If not the last attempt, wait before retrying
        if (i < maxRetries - 1) {
          console.log('⏳ Waiting 3 seconds before retry...');
          await new Promise(resolve => setTimeout(resolve, 3000));
        } else {
          // On last attempt, check one more time and throw if still not confirmed
          try {
            const finalStatus = await this.connection.getSignatureStatus(signature);
            if (finalStatus.value?.confirmationStatus === 'confirmed' || 
                finalStatus.value?.confirmationStatus === 'finalized') {
              console.log('✅ Transaction confirmed on final check');
              return { value: { err: null } };
            }
          } catch (finalError) {
            console.error('❌ Final status check failed:', finalError);
          }
          
          // Throw timeout error
          throw new Error(
            `Transaction confirmation timeout after ${maxRetries} attempts. ` +
            `The transaction may have succeeded. ` +
            `Check signature ${signature} on Solana Explorer to verify.`
          );
        }
      }
    }
  }

  async claimParlayWinnings(wallet, betId, payoutAmount) {
    try {
      if (!wallet.publicKey) {
        throw new Error('Wallet not connected');
      }

      // In production, this would use the smart contract claim method
      // For now, we'll simulate the claim process
      
      const response = await axios.post(
        `${API_URL}/api/parlay-tournaments/claim`,
        {
          userAddress: wallet.publicKey.toString(),
          betId,
          payoutAmount
        }
      );

      return response.data;

    } catch (error) {
      console.error('Error claiming parlay winnings:', error);
      throw error;
    }
  }

  calculateParlayOdds(selections, tournament) {
    const baseMultiplier = parseFloat(tournament.base_multiplier) || 1.8;
    const increment = parseFloat(tournament.multiplier_increment) || 0.5;
    
    // Base multiplier for 2 selections, then add increment for each additional
    const totalMultiplier = baseMultiplier + (increment * (selections.length - 2));
    
    return totalMultiplier;
  }

  validateSelections(selections, matches) {
    // Ensure all selected matches are valid and scheduled
    for (const selection of selections) {
      const match = matches.find(m => m.match_id === selection.match_id);
      
      if (!match) {
        throw new Error(`Invalid match selection: ${selection.match_id}`);
      }
      
      if (match.status !== 'scheduled') {
        throw new Error(`Match ${match.match_id} is not available for betting`);
      }
      
      if (selection.selected_team !== match.team_a && selection.selected_team !== match.team_b) {
        throw new Error(`Invalid team selection for match ${match.match_id}`);
      }
    }
    
    return true;
  }
}

export default new ParlayService();