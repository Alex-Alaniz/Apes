import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useNavigate } from 'react-router-dom';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { Program, AnchorProvider, web3, BN } from '@project-serum/anchor';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';
import { PROGRAM_ID, TOKEN_MINT, getRpcUrl, config } from '../config/solana';
import { isWalletAuthorized } from '../config/access';
import marketService from '../services/marketService';
import believeApiService from '../services/believeApiService';
import { BELIEVE_CONFIG, isBelieveConfigured } from '../config/believe';
import Toast from '../components/Toast';

// For now, we'll use a simplified IDL structure
const IDL = {
  version: "0.1.0",
  name: "market_system",
  instructions: [],
  accounts: []
};

const CreateMarketPage = () => {
  const { publicKey, wallet } = useWallet();
  const walletAdapter = wallet?.adapter;
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [serviceInitialized, setServiceInitialized] = useState(false);
  const [formData, setFormData] = useState({
    question: '',
    optionA: 'Yes',
    optionB: 'No',
    endDate: '',
    category: 'Crypto',
    creatorStake: '100',
    creatorFeeRate: '200', // 2%
    minBetAmount: '10',
    description: ''
  });

  // Initialize market service when wallet connects
  useEffect(() => {
    const initService = async () => {
      if (walletAdapter && publicKey) {
        try {
          await marketService.initialize(walletAdapter);
          setServiceInitialized(true);
          
          // Check if wallet is authorized
          const walletAddress = publicKey.toString();
          const authorized = isWalletAuthorized(walletAddress);
          setIsAuthorized(authorized);
          
          if (!authorized) {
            setToast({
              message: 'Only authorized wallets can create markets',
              type: 'error'
            });
          }
        } catch (error) {
          console.error('Failed to initialize market service:', error);
          setServiceInitialized(false);
        }
      } else {
        setServiceInitialized(false);
        setIsAuthorized(false);
      }
    };

    initService();
  }, [walletAdapter, publicKey]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!publicKey) {
      setToast({
        message: 'Please connect your wallet first!',
        type: 'error'
      });
      return;
    }
    
    if (!isAuthorized) {
      setToast({
        message: 'Your wallet is not authorized to create markets',
        type: 'error'
      });
      return;
    }
    
    if (!serviceInitialized) {
      setToast({
        message: 'Market service not initialized. Please try reconnecting your wallet.',
        type: 'error'
      });
      return;
    }
    
    setLoading(true);
    try {
      const marketData = {
        question: formData.question,
        options: [formData.optionA, formData.optionB],
        category: formData.category,
        resolutionDate: new Date(formData.endDate),
        creatorFeeRate: parseInt(formData.creatorFeeRate),
        minBetAmount: parseFloat(formData.minBetAmount),
        creatorStakeAmount: parseFloat(formData.creatorStake)
      };
      
      const result = await marketService.createMarket(marketData);
      
      // Trigger off-chain burn for market creation
      if (isBelieveConfigured() && result.marketId && result.transaction) {
        try {
          const burnResult = await believeApiService.burnForMarketCreation(
            result.marketId,
            publicKey.toString(),
            formData.question,
            result.transaction
          );
          
          if (burnResult.success) {
            console.log(burnResult.message);
          }
        } catch (burnError) {
          // Log burn errors but don't fail the market creation
          console.error('Failed to burn tokens for market creation:', burnError);
        }
      }
      
      // Check if there's a warning about confirmation timeout
      if (result.warning) {
        setToast({
          message: `Market creation submitted! ${result.warning}`,
          type: 'warning'
        });
        // Still navigate after a delay
        setTimeout(() => navigate('/markets'), 3000);
      } else {
        setToast({
          message: 'Market created successfully!',
          type: 'success'
        });
        setTimeout(() => navigate('/markets'), 2000);
      }
    } catch (error) {
      console.error('Error creating market:', error);
      let errorMessage = error.message || 'Failed to create market';
      
      // Check for specific error types
      if (errorMessage.includes('Transaction confirmation timeout')) {
        errorMessage = 'Transaction sent but confirmation timed out. Please check your wallet to see if it succeeded.';
      }
      
      setToast({
        message: errorMessage,
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Show unauthorized message if wallet is connected but not authorized
  if (publicKey && !isAuthorized) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6">
              <h2 className="text-2xl font-bold text-red-400 mb-4">Unauthorized Access</h2>
              <p className="text-gray-300 mb-4">
                Your wallet <span className="font-mono text-sm">{publicKey.toString()}</span> is not authorized to create markets.
              </p>
              <p className="text-gray-400 text-sm mb-6">
                Only deployer and treasury wallets can create and resolve markets.
              </p>
              <button
                onClick={() => navigate('/markets')}
                className="px-6 py-3 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-600"
              >
                Back to Markets
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-8">Create New Market</h1>
          
          <form onSubmit={handleSubmit} className="bg-gray-800 rounded-lg p-6 space-y-6">
            {/* Question */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Market Question
              </label>
              <input
                type="text"
                name="question"
                value={formData.question}
                onChange={handleInputChange}
                placeholder="Will BTC reach $100k by end of 2024?"
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>

            {/* Options */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Option A
                </label>
                <input
                  type="text"
                  name="optionA"
                  value={formData.optionA}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Option B
                </label>
                <input
                  type="text"
                  name="optionB"
                  value={formData.optionB}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Resolution Date
              </label>
              <input
                type="datetime-local"
                name="endDate"
                value={formData.endDate}
                onChange={handleInputChange}
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Category
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="Crypto">Crypto</option>
                <option value="Sports">Sports</option>
                <option value="Politics">Politics</option>
                <option value="Tech">Tech</option>
                <option value="Science">Science</option>
                <option value="Economy">Economy</option>
              </select>
            </div>

            {/* Creator Stake */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Creator Stake (APES)
              </label>
              <input
                type="number"
                name="creatorStake"
                value={formData.creatorStake}
                onChange={handleInputChange}
                min="100"
                placeholder="Minimum 100 APES"
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
              <p className="text-xs text-gray-400 mt-1">
                0.5% of your stake will be charged as a platform fee
              </p>
              {isBelieveConfigured() && (
                <p className="text-xs text-orange-400 mt-1">
                  🔥 {BELIEVE_CONFIG.burnAmounts.MARKET_CREATION} APES will be burned via Believe
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description (Optional)
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows="3"
                placeholder="Add more context about your market..."
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Submit Button */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading || !publicKey}
                className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Market'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/markets')}
                className="px-6 py-3 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>

            {!publicKey && (
              <p className="text-center text-yellow-400 text-sm">
                Please connect your wallet to create a market
              </p>
            )}
          </form>

          {/* Info Box */}
          <div className="mt-6 bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
            <h3 className="text-blue-400 font-semibold mb-2">ℹ️ Test Mode</h3>
            <p className="text-gray-300 text-sm">
              The platform is currently in test mode on devnet. Markets created here are for testing purposes only.
              You have 1 billion mock APES tokens to experiment with.
            </p>
          </div>
        </div>
      </div>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default CreateMarketPage; 