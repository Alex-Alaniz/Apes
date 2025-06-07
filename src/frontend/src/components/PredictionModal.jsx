import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection } from '@solana/web3.js';
import marketService from '../services/marketService';
import believeApiService from '../services/believeApiService';
import { getCachedTokenDecimals, uiToUnits } from '../utils/tokenUtils';
import { config } from '../config/solana';
import { BELIEVE_CONFIG, isBelieveConfigured } from '../config/believe';

const PredictionModal = ({ market, isOpen, onClose, onSuccess }) => {
  const { publicKey, connected, wallet, signTransaction, signAllTransactions } = useWallet();
  const [selectedOption, setSelectedOption] = useState(0);
  const [betAmount, setBetAmount] = useState('');
  const [isPlacingBet, setIsPlacingBet] = useState(false);

  if (!isOpen || !market) return null;

  // Get options metadata - handle both camelCase and snake_case
  const optionsMetadata = market.optionsMetadata || market.options_metadata || [];

  // Fix options display - use metadata labels if available
  const getOptionLabel = (option, index) => {
    // If we have metadata with proper labels, use those
    if (optionsMetadata[index] && optionsMetadata[index].label) {
      return optionsMetadata[index].label;
    }
    // Otherwise use the blockchain option
    return option;
  };
  
  // Filter out empty options and use actual option count
  const actualOptions = [];
  for (let i = 0; i < market.optionCount && i < market.options.length; i++) {
          const option = market.options?.[i];
    const label = getOptionLabel(option, i);
    // Only include non-empty options that users can bet on
    if (label && label.trim() !== '') {
      actualOptions.push({ label, index: i, icon: optionsMetadata[i]?.icon });
    }
  }

  // Check if this is a binary market (Yes/No)
  const isBinaryMarket = actualOptions.length === 2 && 
    actualOptions.some(opt => opt.label.toLowerCase() === 'yes') &&
    actualOptions.some(opt => opt.label.toLowerCase() === 'no');

  const handleClose = () => {
    setBetAmount('');
    setSelectedOption(0);
    onClose();
  };

  const handleOptionSelect = (index) => {
    setSelectedOption(index);
  };

  const handlePlaceBet = async (e) => {
    e.preventDefault();
    
    if (!publicKey || !connected || selectedOption === null || !betAmount) return;
    
    // Validate that the selected option is valid
    const selectedOptionData = actualOptions.find(opt => opt.index === selectedOption);
    if (!selectedOptionData) {
      alert('Invalid option selected');
      return;
    }
    
    // Ensure we're not betting on a placeholder option
    if (selectedOptionData.label.startsWith('Option ') && selectedOptionData.label.match(/Option \d+$/)) {
      alert('This option is not available for betting');
      return;
    }
    
    // Ensure marketService is initialized before placing bet
    if (wallet && publicKey) {
      // Use actual Phantom wallet with signAndSendTransaction method
      const phantomWallet = window.phantom?.solana;
      if (phantomWallet && typeof phantomWallet.signAndSendTransaction === 'function') {
        await marketService.initialize(phantomWallet);
      } else {
        alert('Please use Phantom wallet to place predictions');
        return;
      }
    }
    
    setIsPlacingBet(true);
    try {
      const result = await marketService.placeBet(market.publicKey, selectedOption, parseFloat(betAmount));
      
      // Check if there's a warning about confirmation timeout
      if (result.warning) {
        // Show a warning toast but still treat as success
        if (onSuccess) {
          onSuccess({
            market: market.question,
            option: selectedOptionData.label,
            amount: betAmount,
            warning: result.warning
          });
        }
      } else {
        // Normal success
        if (onSuccess) {
          onSuccess({
            market: market.question,
            option: selectedOptionData.label,
            amount: betAmount
          });
        }
      }
      
      // Debug logging for Believe API integration (SECURE - no API key exposed)
      console.log('🔍 Believe API Debug:');
      console.log('- isBelieveConfigured():', isBelieveConfigured());
      console.log('- API URL:', BELIEVE_CONFIG.apiUrl);
      console.log('- API Key present:', !!BELIEVE_CONFIG.apiKey);
      console.log('- Proof Types:', BELIEVE_CONFIG.proofTypes);
      console.log('- Burn Amounts:', BELIEVE_CONFIG.burnAmounts);
      
      // Trigger off-chain burn with fixed amount
      if (isBelieveConfigured()) {
        console.log('✅ Believe API is configured, attempting burn...');
        try {
          const burnResult = await believeApiService.burnForPrediction(
            market.publicKey,
            publicKey.toString(),
            selectedOption,
            parseFloat(betAmount),
            result.transaction
          );
          
          if (burnResult.success) {
            console.log(burnResult.message);
            // Show burn transaction hash prominently
            if (burnResult.data?.txHash) {
              console.log(`🔗 Believe Burn Transaction: ${burnResult.data.txHash}`);
              console.log(`View on Explorer: https://solscan.io/tx/${burnResult.data.txHash}`);
            }
          }
        } catch (burnError) {
          // Log burn errors but don't fail the prediction
          console.error('❌ Believe API burn failed:', burnError);
          console.error('- Error details:', {
            message: burnError.message,
            status: burnError.response?.status,
            statusText: burnError.response?.statusText,
            data: burnError.response?.data
          });
          console.log('🔧 Burn was attempted with:', {
            marketId: market.publicKey,
            userWallet: publicKey.toString(),
            optionIndex: selectedOption,
            betAmount: parseFloat(betAmount),
            txHash: result.transaction
          });
          
          // Test basic connectivity if it's a network error
          if (burnError.message === 'Network Error') {
            console.log('🔍 Testing basic API connectivity...');
            believeApiService.testConnectivity();
          }
        }
      }
      
      // Reset and close
      setBetAmount('');
      setSelectedOption(0);
      onClose();
    } catch (error) {
      console.error('Error placing bet:', error);
      let errorMessage = error.message || 'Failed to place prediction';
      
      // Check for specific error types
      if (errorMessage.includes('Transaction confirmation timeout')) {
        errorMessage = 'Transaction sent but confirmation timed out. Please check your wallet to see if it succeeded.';
      } else if (errorMessage.includes('insufficient funds')) {
        errorMessage = 'Insufficient APES tokens. Please ensure you have enough tokens and SOL for fees.';
      }
      
      alert(errorMessage);
    } finally {
      setIsPlacingBet(false);
    }
  };

  // Calculate fees
  const platformFeeAmount = betAmount ? (parseFloat(betAmount) * 0.01).toFixed(2) : '0';
  const contractFee = betAmount ? (parseFloat(betAmount) * 0.025).toFixed(2) : '0';
  const totalFees = betAmount ? (parseFloat(betAmount) * 0.035).toFixed(2) : '0';
  const netAmount = betAmount ? (parseFloat(betAmount) - parseFloat(totalFees)).toFixed(2) : '0';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold text-white mb-4">Place Prediction</h2>
        
        <div className="mb-4">
          <p className="text-gray-300 mb-4">{market.question}</p>
          
          <div className="space-y-2">
            {actualOptions.map((option) => {
              const { label, icon, index } = option;
              
              return (
                <button
                  key={index}
                  onClick={() => handleOptionSelect(index)}
                  className={`w-full p-3 rounded-lg text-left transition-colors ${
                    selectedOption === index
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {!isBinaryMarket && icon && (
                      <img 
                        src={icon} 
                        alt={label}
                        className="w-8 h-8 rounded object-cover flex-shrink-0"
                        onError={(e) => e.target.style.display = 'none'}
                      />
                    )}
                    <span className="font-medium">{label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <form onSubmit={handlePlaceBet}>
          <div className="mb-4">
            <label className="block text-gray-300 mb-2">
              Amount (APES)
            </label>
            <input
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
              placeholder="Enter amount"
              step="0.01"
              min="0"
              required
            />
          </div>

          {betAmount && (
            <div className="mb-4 text-sm space-y-2">
              <div className="space-y-1">
                <div className="flex justify-between text-gray-400">
                  <span>Platform Fee (1%):</span>
                  <div className="text-right">
                    <span className="text-gray-300">{platformFeeAmount} APES</span>
                    <span className="text-xs text-purple-400 ml-1">→ Community Treasury</span>
                  </div>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Contract Fee (2.5%):</span>
                  <div className="text-right">
                    <span className="text-gray-300">{contractFee} APES</span>
                    <span className="text-xs text-blue-400 ml-1">→ PRIMAPE</span>
                  </div>
                </div>
                {isBelieveConfigured() && (
                  <div className="flex justify-between text-orange-400">
                    <span>Believe Burn (Fixed):</span>
                    <div className="text-right">
                      <span>{BELIEVE_CONFIG.burnAmounts.PREDICTION_BET} APES 🔥</span>
                      <span className="text-xs ml-1">→ Token Burn</span>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="text-xs text-gray-500 pt-1 italic">
                * Believe burn also applies when claiming rewards
              </div>
              
              <div className="border-t border-gray-600 pt-2 flex justify-between font-semibold text-white text-base">
                <span>You'll contribute:</span>
                <span className="text-lg">{netAmount} APES</span>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={!connected || !betAmount || isPlacingBet}
              className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPlacingBet ? 'Placing...' : 'Place Prediction'}
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 bg-gray-700 text-gray-300 py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PredictionModal; 