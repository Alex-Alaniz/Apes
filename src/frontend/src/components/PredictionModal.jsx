import React, { useState } from 'react';
import { Connection } from '@solana/web3.js';
import marketService from '../services/marketService';
import believeApiService from '../services/believeApiService';
import { getCachedTokenDecimals, uiToUnits } from '../utils/tokenUtils';
import { config } from '../config/solana';
import { BELIEVE_CONFIG, isBelieveConfigured } from '../config/believe';
import { useSolanaWallet } from '../utils/solanaWalletIntegration';
import { usePrivySolanaWallet } from '../hooks/usePrivySolanaWallet';
import toast from 'react-hot-toast';

const PredictionModal = ({ market, isOpen, onClose, onSuccess }) => {
  const { solanaWallet, connectSolana } = useSolanaWallet();
  // Also try the new Privy-specific hook
  const privyHook = usePrivySolanaWallet();
  
  const [selectedOption, setSelectedOption] = useState(0);
  const [betAmount, setBetAmount] = useState('');
  const [isPlacingBet, setIsPlacingBet] = useState(false);
  
  // Debug logging
  React.useEffect(() => {
    if (isOpen) {
      console.log('PredictionModal wallet state:', {
        standardHook: { hasSolana: !!solanaWallet },
        privyHook: privyHook.debug
      });
    }
  }, [isOpen, solanaWallet, privyHook.debug]);

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
    
    const hasSolana = solanaWallet || privyHook.hasSolanaWallet;
    
    if (!hasSolana || selectedOption === null || !betAmount) {
      if (!hasSolana) {
        toast.error('Please connect a Solana wallet (Phantom, Solflare, etc.) to place bets');
      }
      return;
    }
    
    // Validate that the selected option is valid
    const selectedOptionData = actualOptions.find(opt => opt.index === selectedOption);
    if (!selectedOptionData) {
      toast.error('Invalid option selected');
      return;
    }
    
    // Ensure we're not betting on a placeholder option
    if (selectedOptionData.label.startsWith('Option ') && selectedOptionData.label.match(/Option \d+$/)) {
      toast.error('This option is not available for betting');
      return;
    }
    
    // Initialize marketService with Solana wallet
    try {
      let wallet, publicKey, provider;
      
      // Try Privy hook first if standard hook doesn't have a wallet
      if (!solanaWallet && privyHook.hasSolanaWallet) {
        console.log('Using Privy-specific Solana connection');
        const result = await privyHook.connectSolana();
        wallet = result.wallet;
        publicKey = result.publicKey;
        provider = result.provider;
      } else {
        const result = await connectSolana();
        wallet = result.wallet;
        publicKey = result.publicKey;
        provider = result.provider;
      }
      
      // Initialize market service
      if (provider) {
        await marketService.initialize(provider.wallet);
      } else if (wallet) {
        await marketService.initialize(wallet);
      } else {
        throw new Error('No wallet available for initialization');
      }
      
      console.log('✅ Market service initialized with Solana wallet:', publicKey.toString());
    } catch (error) {
      console.error('Failed to connect Solana wallet:', error);
      toast.error(error.message || 'Failed to connect Solana wallet');
      return;
    }
    
    setIsPlacingBet(true);
    try {
      const result = await marketService.placeBet(market.publicKey, selectedOption, parseFloat(betAmount));
      
      console.log('🎯 Bet placement result:', result);
      
      // TRIGGER BELIEVE API BURN IMMEDIATELY - Don't wait for perfect confirmation
      if (result.transaction && isBelieveConfigured()) {
        console.log('🔍 Believe API Debug:');
        console.log('- isBelieveConfigured():', isBelieveConfigured());
        console.log('- API URL:', BELIEVE_CONFIG.apiUrl);
        console.log('- API Key present:', !!BELIEVE_CONFIG.apiKey);
        console.log('- Transaction ID:', result.transaction);
        
        console.log('✅ Believe API is configured, attempting burn...');
        
        // Run burn in background (non-blocking)
        believeApiService.burnForPrediction(
          market.publicKey,
          solanaWallet.address,
          selectedOption,
          parseFloat(betAmount),
          result.transaction
        ).then(burnResult => {
          if (burnResult.success) {
            console.log('🔥 Believe burn successful:', burnResult.message);
            if (burnResult.data?.txHash) {
              console.log(`🔗 Believe Burn Transaction: ${burnResult.data.txHash}`);
              console.log(`🌐 View on Explorer: https://solscan.io/tx/${burnResult.data.txHash}`);
            }
          } else {
            console.error('❌ Believe burn failed:', burnResult.message);
          }
        }).catch(burnError => {
          console.error('❌ Believe API burn error:', burnError);
          console.error('- Error details:', {
            message: burnError.message,
            status: burnError.response?.status,
            statusText: burnError.response?.statusText,
            data: burnError.response?.data
          });
          
          // Test basic connectivity if it's a network error
          if (burnError.message === 'Network Error') {
            console.log('🔍 Testing basic API connectivity...');
            believeApiService.testConnectivity();
          }
        });
      } else if (!result.transaction) {
        console.warn('⚠️ No transaction ID received, cannot trigger Believe API burn');
      } else if (!isBelieveConfigured()) {
        console.log('ℹ️ Believe API not configured, skipping burn');
      }
      
      // Show success message to user
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
              disabled={(!solanaWallet && !privyHook.hasSolanaWallet) || !betAmount || isPlacingBet}
              className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPlacingBet ? 'Placing...' : 
                (!solanaWallet && !privyHook.hasSolanaWallet) ? 'Connect Solana Wallet' : 'Place Prediction'}
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