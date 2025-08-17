import { Connection, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { 
  TOKEN_PROGRAM_ID,
  createTransferInstruction,
  getAssociatedTokenAddress,
  ASSOCIATED_TOKEN_PROGRAM_ID
} from '@solana/spl-token';
import * as anchor from '@coral-xyz/anchor';
import axios from 'axios';
// import { believeApiService } from './believeApiService';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
const APES_TOKEN_MINT = new PublicKey(import.meta.env.VITE_TOKEN_MINT || '9BZJXtmfPpkHnM57gHEx5Pc9oQhLhJtr4mhCsNtttTts');
const TREASURY_ADDRESS = new PublicKey(import.meta.env.VITE_TREASURY || 'APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z');

class ParlayService {
  constructor() {
    this.connection = null;
    this.program = null;
  }

  async initialize(connection, wallet) {
    this.connection = connection;
    // For now, we'll use simple token transfers
    // In production, this would connect to the smart contract
  }

  async placeParlayBet(wallet, tournamentId, selections, stakeAmount) {
    try {
      if (!wallet.publicKey) {
        throw new Error('Wallet not connected');
      }

      // Convert stake amount to smallest unit (assuming 6 decimals for APES)
      const stakeAmountLamports = stakeAmount * 1e6;

      // Create transaction for token transfer
      const transaction = new Transaction();

      // Get user's APES token account
      const userTokenAccount = await getAssociatedTokenAddress(
        APES_TOKEN_MINT,
        wallet.publicKey
      );

      // Get treasury's APES token account
      const treasuryTokenAccount = await getAssociatedTokenAddress(
        APES_TOKEN_MINT,
        TREASURY_ADDRESS
      );

      // Create transfer instruction
      const transferInstruction = createTransferInstruction(
        userTokenAccount,
        treasuryTokenAccount,
        wallet.publicKey,
        stakeAmountLamports
      );

      transaction.add(transferInstruction);

      // Sign and send transaction
      const signature = await wallet.sendTransaction(transaction, this.connection);
      
      // Wait for confirmation
      await this.connection.confirmTransaction(signature, 'confirmed');

      // Record bet in backend
      const response = await axios.post(
        `${API_URL}/api/parlay-tournaments/${tournamentId}/bet`,
        {
          userAddress: wallet.publicKey.toString(),
          selections,
          stakeAmount,
          transactionSignature: signature
        }
      );

      // Record burn event (2.5% of stake)
      // Note: Believe API integration temporarily disabled
      // if (believeApiService.isConfigured()) {
      //   const burnAmount = stakeAmount * 0.025;
      //   await believeApiService.recordBurn({
      //     userAddress: wallet.publicKey.toString(),
      //     amount: burnAmount,
      //     action: 'parlay_bet',
      //     transactionSignature: signature,
      //     metadata: {
      //       tournamentId,
      //       selectionsCount: selections.length,
      //       stakeAmount
      //     }
      //   });
      // }

      return {
        success: true,
        signature,
        betId: response.data.betId,
        potentialPayout: response.data.potentialPayout
      };

    } catch (error) {
      console.error('Error placing parlay bet:', error);
      throw error;
    }
  }

  async claimParlayWinnings(wallet, betId, payoutAmount) {
    try {
      if (!wallet.publicKey) {
        throw new Error('Wallet not connected');
      }

      // In production, this would interact with the smart contract
      // For now, we'll simulate the claim process
      
      const response = await axios.post(
        `${API_URL}/api/parlay-tournaments/claim`,
        {
          userAddress: wallet.publicKey.toString(),
          betId,
          payoutAmount
        }
      );

      // Record burn event (1.5% of payout)
      // Note: Believe API integration temporarily disabled
      // if (believeApiService.isConfigured() && response.data.signature) {
      //   const burnAmount = payoutAmount * 0.015;
      //   await believeApiService.recordBurn({
      //     userAddress: wallet.publicKey.toString(),
      //     amount: burnAmount,
      //     action: 'parlay_claim',
      //     transactionSignature: response.data.signature,
      //     metadata: {
      //       betId,
      //       payoutAmount
      //     }
      //   });
      // }

      return response.data;

    } catch (error) {
      console.error('Error claiming parlay winnings:', error);
      throw error;
    }
  }

  // Remove this method as we're now using getAssociatedTokenAddress from spl-token

  calculateParlayOdds(selections, tournament) {
    const baseMultiplier = parseFloat(tournament.base_multiplier) || 1.8;
    const increment = parseFloat(tournament.multiplier_increment) || 0.5;
    
    // Base multiplier + increment for each additional selection beyond the minimum
    const totalMultiplier = baseMultiplier + (increment * (selections.length - 1));
    
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