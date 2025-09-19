import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import marketService from '../services/marketService';
import toast from 'react-hot-toast';

const QuickBetInterface = ({ market, onBetPlaced }) => {
  const { publicKey, signTransaction, connected } = useWallet();
  const [selectedOption, setSelectedOption] = useState(null);
  const [betAmount, setBetAmount] = useState('0.1');
  const [isPlacing, setIsPlacing] = useState(false);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(null);

  // Quick bet amounts
  const quickAmounts = [0.1, 0.5, 1, 5];

  // Countdown timer
  useEffect(() => {
    if (market?.expires_at) {
      const timer = setInterval(() => {
        const now = new Date();
        const expires = new Date(market.expires_at);
        const diff = expires - now;

        if (diff > 0) {
          const minutes = Math.floor(diff / 60000);
          const seconds = Math.floor((diff % 60000) / 1000);
          setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
        } else {
          setTimeLeft('Expired');
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [market]);

  // Calculate potential payout
  const calculatePayout = () => {
    if (!selectedOption || !betAmount || !market) return 0;
    
    const amount = parseFloat(betAmount);
    const optionVolumes = market.option_volumes || { "0": 0, "1": 0 };
    const yesVolume = parseFloat(optionVolumes["0"] || 0);
    const noVolume = parseFloat(optionVolumes["1"] || 0);
    const totalVolume = yesVolume + noVolume + amount;
    
    if (selectedOption === 0) {
      // Betting YES
      const newYesVolume = yesVolume + amount;
      const payout = (totalVolume * 0.97) * (amount / newYesVolume); // 3% total fees
      return payout.toFixed(3);
    } else {
      // Betting NO
      const newNoVolume = noVolume + amount;
      const payout = (totalVolume * 0.97) * (amount / newNoVolume);
      return payout.toFixed(3);
    }
  };

  const handlePlaceBet = async () => {
    if (selectedOption === null || !betAmount) {
      setError('Please select an option and enter amount');
      return;
    }

    if (!connected || !publicKey) {
      setError('Please connect your wallet');
      return;
    }

    setIsPlacing(true);
    setError('');

    try {
      // Check if market has on-chain address
      if (!market.market_address && !market.publicKey) {
        // Create on-chain market first if it doesn't exist
        toast.error('Market not yet deployed on-chain. Please wait for admin to deploy.');
        return;
      }

      const marketAddress = market.market_address || market.publicKey;
      
      // Show loading toast
      const loadingToast = toast.loading('Placing bet...');

      // Use marketService to place bet on existing smart contract
      const result = await marketService.placeBet(
        marketAddress,
        selectedOption,
        parseFloat(betAmount)
      );

      // Dismiss loading toast
      toast.dismiss(loadingToast);

      if (result.success) {
        // Show success message
        toast.success('Bet placed successfully!');

        // Record bet in database for livestream tracking
        try {
          const response = await fetch(`${import.meta.env.VITE_API_URL}/api/livestreams/bet`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              marketId: market.id,
              option: selectedOption,
              amount: betAmount,
              userWallet: publicKey.toString(),
              txSignature: result.transaction
            })
          });

          if (!response.ok) {
            console.error('Failed to record bet in livestream database');
          }
        } catch (dbError) {
          console.error('Error recording bet:', dbError);
        }

        // Success callback
        onBetPlaced({
          marketId: market.id,
          option: selectedOption,
          amount: betAmount,
          txid: result.transaction
        });

        // Reset form
        setSelectedOption(null);
        setBetAmount('0.1');
      } else if (result.warning) {
        // Transaction sent but confirmation timed out
        toast.warning(result.warning);
      }
      
    } catch (err) {
      setError(err.message || 'Failed to place bet');
      console.error('Error placing bet:', err);
    } finally {
      setIsPlacing(false);
    }
  };

  if (!market) return null;

  const isExpired = timeLeft === 'Expired';
  const optionVolumes = market.option_volumes || { "0": 0, "1": 0 };
  const yesVolume = parseFloat(optionVolumes["0"] || 0);
  const noVolume = parseFloat(optionVolumes["1"] || 0);
  const totalVolume = yesVolume + noVolume;
  const yesPercentage = totalVolume > 0 ? (yesVolume / totalVolume * 100).toFixed(0) : 50;
  const noPercentage = totalVolume > 0 ? (noVolume / totalVolume * 100).toFixed(0) : 50;

  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-700">
      {/* Market Question */}
      <h3 className="text-xl font-bold text-white mb-4">{market.question}</h3>

      {/* Timer */}
      <div className="flex justify-between items-center mb-6">
        <span className="text-gray-400">
          Time remaining:
        </span>
        <span className={`text-lg font-bold ${isExpired ? 'text-red-500' : 'text-green-400'}`}>
          ⏱️ {timeLeft}
        </span>
      </div>

      {!isExpired && (
        <>
          {/* Options */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <button
              onClick={() => setSelectedOption(0)}
              className={`p-4 rounded-lg border-2 transition-all ${
                selectedOption === 0
                  ? 'border-green-500 bg-green-500/10'
                  : 'border-gray-600 hover:border-gray-500'
              }`}
            >
              <p className="text-2xl font-bold text-green-400 mb-1">YES</p>
              <p className="text-sm text-gray-400">{yesPercentage}%</p>
              <p className="text-xs text-gray-500">{yesVolume.toFixed(2)} SOL</p>
            </button>

            <button
              onClick={() => setSelectedOption(1)}
              className={`p-4 rounded-lg border-2 transition-all ${
                selectedOption === 1
                  ? 'border-red-500 bg-red-500/10'
                  : 'border-gray-600 hover:border-gray-500'
              }`}
            >
              <p className="text-2xl font-bold text-red-400 mb-1">NO</p>
              <p className="text-sm text-gray-400">{noPercentage}%</p>
              <p className="text-xs text-gray-500">{noVolume.toFixed(2)} SOL</p>
            </button>
          </div>

          {/* Amount Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Bet Amount (SOL)
            </label>
            <div className="flex gap-2 mb-2">
              {quickAmounts.map(amount => (
                <button
                  key={amount}
                  onClick={() => setBetAmount(amount.toString())}
                  className={`px-3 py-1 rounded-lg text-sm ${
                    betAmount === amount.toString()
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {amount}
                </button>
              ))}
            </div>
            <input
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              placeholder="Enter amount"
              className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              min="0.1"
              step="0.1"
            />
          </div>

          {/* Potential Payout */}
          {selectedOption !== null && betAmount && (
            <div className="mb-4 bg-gray-800 rounded-lg p-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Potential payout:</span>
                <span className="text-lg font-bold text-white">
                  {calculatePayout()} SOL
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                ({((calculatePayout() / parseFloat(betAmount) - 1) * 100).toFixed(0)}% profit)
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-4 bg-red-900/20 border border-red-600 rounded-lg p-3">
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          )}

          {/* Place Bet Button */}
          <button
            onClick={handlePlaceBet}
            disabled={isPlacing || selectedOption === null || !betAmount}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPlacing ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                Placing bet...
              </span>
            ) : (
              `Place ${betAmount} SOL on ${selectedOption === 0 ? 'YES' : selectedOption === 1 ? 'NO' : '...'}`
            )}
          </button>
        </>
      )}

      {isExpired && (
        <div className="text-center py-8">
          <p className="text-gray-400 mb-4">This market has expired</p>
          {market.winning_option !== null && (
            <p className="text-2xl font-bold">
              Winner: <span className={market.winning_option === 0 ? 'text-green-400' : 'text-red-400'}>
                {market.winning_option === 0 ? 'YES' : 'NO'}
              </span>
            </p>
          )}
        </div>
      )}

      {/* Market Stats */}
      <div className="mt-6 pt-6 border-t border-gray-700 grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-sm text-gray-400">Volume</p>
          <p className="font-bold text-white">{totalVolume.toFixed(2)} SOL</p>
        </div>
        <div>
          <p className="text-sm text-gray-400">Bettors</p>
          <p className="font-bold text-white">{market.unique_bettors || 0}</p>
        </div>
        <div>
          <p className="text-sm text-gray-400">Creator</p>
          <p className="font-bold text-white text-xs truncate">
            {market.creator_wallet?.substring(0, 8)}...
          </p>
        </div>
      </div>
    </div>
  );
};

export default QuickBetInterface;