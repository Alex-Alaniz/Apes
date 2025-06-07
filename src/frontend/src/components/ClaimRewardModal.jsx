import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import marketService from '../services/marketService';
import believeApiService from '../services/believeApiService';
import { BELIEVE_CONFIG, isBelieveConfigured } from '../config/believe';

const ClaimRewardModal = ({ isOpen, onClose, position, market, potentialWinnings, onSuccess }) => {
  const { publicKey } = useWallet();
  const [isClaiming, setIsClaiming] = useState(false);

  if (!isOpen || !position || !market) return null;

  const handleClaim = async () => {
    if (!publicKey) return;
    
    setIsClaiming(true);
    try {
      // Use backend claim method if we have a prediction ID
      let result;
      if (position.id) {
        // Backend-stored prediction - use backend claim API
        result = await marketService.claimRewardFromBackend(position.id, potentialWinnings);
      } else {
        // Fallback to blockchain claim for legacy predictions
        result = await marketService.claimReward(market.publicKey || market.address, position.optionIndex);
      }
      
      // Trigger off-chain burn for claim
      if (isBelieveConfigured()) {
        try {
          const burnResult = await believeApiService.burnForClaim(
            market.publicKey || market.address,
            publicKey.toString(),
            potentialWinnings,
            result.transaction || `backend_claim_${position.id}`
          );
          
          if (burnResult.success) {
            console.log(burnResult.message);
          }
        } catch (burnError) {
          // Log burn errors but don't fail the claim
          console.error('Failed to burn tokens:', burnError);
        }
      }
      
      // Check if there's a warning about confirmation timeout
      if (result.warning) {
        onSuccess(result.warning);
      } else {
        onSuccess(result.message || 'Reward claimed successfully!');
      }
      onClose();
    } catch (error) {
      console.error('Error claiming reward:', error);
      let errorMessage = error.message || 'Failed to claim reward';
      
      // Check for specific error types
      if (errorMessage.includes('Transaction confirmation timeout')) {
        errorMessage = 'Transaction sent but confirmation timed out. Please check your wallet to see if it succeeded.';
      }
      
      alert(errorMessage);
    } finally {
      setIsClaiming(false);
    }
  };

  // Calculate fees
  const claimBurnFee = potentialWinnings * 0.015; // 1.5% claim burn rate
  const contractTotal = potentialWinnings + claimBurnFee; // Total before fees
  const netReward = potentialWinnings;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold text-white mb-4">Claim Reward</h2>
        
        <div className="mb-4">
          <p className="text-gray-300 mb-2">{market.question}</p>
          <div className="bg-green-900/20 border border-green-800/50 rounded-lg p-3">
            <p className="text-green-400 font-medium">
              ✓ Your winning prediction: {market.options[position.optionIndex]}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              Amount bet: {position.amount.toFixed(2)} APES
            </p>
          </div>
        </div>

        <div className="mb-4 bg-gray-900/50 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-medium text-gray-300 mb-2">Reward Breakdown</h3>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-400">
              <span>Gross Reward:</span>
              <span className="text-gray-300">{contractTotal.toFixed(2)} APES</span>
            </div>
            
            <div className="flex justify-between text-gray-400">
              <span>Contract Fee (1.5%):</span>
              <div className="text-right">
                <span className="text-gray-300">-{claimBurnFee.toFixed(2)} APES</span>
                <span className="text-xs text-blue-400 ml-1">→ PRIMAPE</span>
              </div>
            </div>
            
            {isBelieveConfigured() && (
              <div className="flex justify-between text-orange-400">
                <span>Believe Burn (Fixed):</span>
                <div className="text-right">
                  <span>{BELIEVE_CONFIG.burnAmounts.PREDICTION_CLAIM} APES 🔥</span>
                  <span className="text-xs ml-1">→ Token Burn</span>
                </div>
              </div>
            )}
            
            <div className="border-t border-gray-600 pt-2 flex justify-between font-semibold text-white text-base">
              <span>You'll receive:</span>
              <span className="text-lg text-green-400">+{netReward.toFixed(2)} APES</span>
            </div>
          </div>
        </div>

        <div className="text-xs text-gray-500 mb-4 italic">
          * Contract fee goes to PRIMAPE, Believe burn happens from LP wallet
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleClaim}
            disabled={isClaiming}
            className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isClaiming ? 'Claiming...' : 'Confirm Claim'}
          </button>
          <button
            onClick={onClose}
            disabled={isClaiming}
            className="flex-1 bg-gray-700 text-gray-300 py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClaimRewardModal; 