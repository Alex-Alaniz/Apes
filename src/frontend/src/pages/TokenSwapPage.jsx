import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import useBelieveApp from '../utils/useBelieveApp';
import useMeteora from '../utils/useMeteora';

const TokenSwapPage = () => {
  const { connected, publicKey } = useWallet();
  const { tokenPrice, poolInfo, isLoading: meteoraLoading, calculateSwap, executeSwap, getHistoricalPrices } = useMeteora();
  const { isProcessing: believeAppLoading } = useBelieveApp();
  
  const [inputAmount, setInputAmount] = useState('');
  const [swapDirection, setSwapDirection] = useState('buy'); // 'buy' or 'sell'
  const [swapDetails, setSwapDetails] = useState(null);
  const [priceHistory, setPriceHistory] = useState([]);
  const [timeframe, setTimeframe] = useState('24h');
  const [isLoading, setIsLoading] = useState(false);
  const [txHash, setTxHash] = useState('');
  
  // Load price history on component mount and timeframe change
  useEffect(() => {
    const loadPriceHistory = async () => {
      try {
        const history = await getHistoricalPrices(timeframe);
        setPriceHistory(history);
      } catch (error) {
        console.error('Error loading price history:', error);
      }
    };
    
    loadPriceHistory();
  }, [timeframe]);
  
  // Calculate swap details when input amount or direction changes
  useEffect(() => {
    const calculateSwapDetails = async () => {
      if (!inputAmount || isNaN(parseFloat(inputAmount)) || parseFloat(inputAmount) <= 0) {
        setSwapDetails(null);
        return;
      }
      
      try {
        const amount = parseFloat(inputAmount);
        const details = await calculateSwap(amount, swapDirection === 'sell');
        setSwapDetails(details);
      } catch (error) {
        console.error('Error calculating swap details:', error);
        setSwapDetails(null);
      }
    };
    
    calculateSwapDetails();
  }, [inputAmount, swapDirection]);
  
  // Handle swap execution
  const handleSwap = async () => {
    if (!connected || !swapDetails) return;
    
    try {
      setIsLoading(true);
      
      const tx = await executeSwap(
        parseFloat(inputAmount),
        swapDetails.minimumReceived,
        swapDirection === 'sell'
      );
      
      setTxHash(tx);
      setInputAmount('');
      setSwapDetails(null);
      setIsLoading(false);
    } catch (error) {
      console.error('Error executing swap:', error);
      setIsLoading(false);
    }
  };
  
  // Toggle swap direction
  const toggleSwapDirection = () => {
    setSwapDirection(swapDirection === 'buy' ? 'sell' : 'buy');
    setInputAmount('');
    setSwapDetails(null);
  };
  
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-8">Token Swap</h1>
      
      {/* Price Information */}
      <div className="card mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Current Price</h2>
          <div className="flex space-x-2">
            <button 
              onClick={() => setTimeframe('1h')}
              className={`px-3 py-1 rounded text-sm ${timeframe === '1h' ? 'bg-[#0066FF] text-white' : 'bg-[#1E2738] text-gray-300'}`}
            >
              1H
            </button>
            <button 
              onClick={() => setTimeframe('24h')}
              className={`px-3 py-1 rounded text-sm ${timeframe === '24h' ? 'bg-[#0066FF] text-white' : 'bg-[#1E2738] text-gray-300'}`}
            >
              24H
            </button>
            <button 
              onClick={() => setTimeframe('7d')}
              className={`px-3 py-1 rounded text-sm ${timeframe === '7d' ? 'bg-[#0066FF] text-white' : 'bg-[#1E2738] text-gray-300'}`}
            >
              7D
            </button>
            <button 
              onClick={() => setTimeframe('30d')}
              className={`px-3 py-1 rounded text-sm ${timeframe === '30d' ? 'bg-[#0066FF] text-white' : 'bg-[#1E2738] text-gray-300'}`}
            >
              30D
            </button>
          </div>
        </div>
        
        <div className="flex justify-between items-center mb-6">
          <div>
            <p className="text-3xl font-bold text-white">${tokenPrice ? tokenPrice.toFixed(4) : '0.0000'}</p>
            <p className="text-sm text-green-500">+2.5% (24h)</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-400">Pool Liquidity</p>
            <p className="text-lg font-semibold text-white">
              ${poolInfo ? (poolInfo.totalLiquidity).toLocaleString() : '0'}
            </p>
          </div>
        </div>
        
        {/* Price Chart Placeholder */}
        <div className="bg-[#1E2738] h-64 rounded-lg flex items-center justify-center mb-4">
          <p className="text-gray-400">Price Chart (would be implemented with Chart.js)</p>
        </div>
        
        <div className="flex justify-between text-sm text-gray-400">
          <p>Volume (24h): ${poolInfo ? poolInfo.volume24h.toLocaleString() : '0'}</p>
          <p>Pool Fee: {poolInfo ? poolInfo.fee : '0.3'}%</p>
        </div>
      </div>
      
      {/* Swap Interface */}
      <div className="card mb-8">
        <h2 className="text-xl font-semibold mb-4">Swap Tokens</h2>
        
        <div className="bg-[#1E2738] p-4 rounded-lg mb-4">
          <div className="flex justify-between mb-2">
            <label className="text-gray-300">You Pay</label>
            <p className="text-sm text-gray-400">
              {swapDirection === 'buy' ? 'USDC Balance: 1,000' : 'Token Balance: 5,000'}
            </p>
          </div>
          <div className="flex items-center">
            <input
              type="number"
              value={inputAmount}
              onChange={(e) => setInputAmount(e.target.value)}
              placeholder="0.0"
              className="bg-transparent text-white text-xl w-full focus:outline-none"
            />
            <button className="bg-[#2A3548] text-white px-3 py-1 rounded">
              {swapDirection === 'buy' ? 'USDC' : 'TOKEN'}
            </button>
          </div>
        </div>
        
        <div className="flex justify-center mb-4">
          <button 
            onClick={toggleSwapDirection}
            className="bg-[#1E2738] p-2 rounded-full"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#0066FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </button>
        </div>
        
        <div className="bg-[#1E2738] p-4 rounded-lg mb-6">
          <div className="flex justify-between mb-2">
            <label className="text-gray-300">You Receive</label>
            <p className="text-sm text-gray-400">
              {swapDirection === 'buy' ? 'Token Balance: 5,000' : 'USDC Balance: 1,000'}
            </p>
          </div>
          <div className="flex items-center">
            <input
              type="text"
              value={swapDetails ? swapDetails.outputAmount.toFixed(6) : '0.0'}
              readOnly
              className="bg-transparent text-white text-xl w-full focus:outline-none"
            />
            <button className="bg-[#2A3548] text-white px-3 py-1 rounded">
              {swapDirection === 'buy' ? 'TOKEN' : 'USDC'}
            </button>
          </div>
        </div>
        
        {swapDetails && (
          <div className="bg-[#1E2738] p-3 rounded-lg mb-6 text-sm">
            <div className="flex justify-between mb-1">
              <span className="text-gray-400">Rate</span>
              <span className="text-white">
                1 {swapDirection === 'buy' ? 'USDC' : 'TOKEN'} = {(swapDetails.outputAmount / parseFloat(inputAmount)).toFixed(6)} {swapDirection === 'buy' ? 'TOKEN' : 'USDC'}
              </span>
            </div>
            <div className="flex justify-between mb-1">
              <span className="text-gray-400">Price Impact</span>
              <span className={swapDetails.priceImpact > 5 ? 'text-red-500' : 'text-green-500'}>
                {swapDetails.priceImpact.toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between mb-1">
              <span className="text-gray-400">Fee</span>
              <span className="text-white">
                {swapDetails.fee.toFixed(6)} {swapDirection === 'buy' ? 'USDC' : 'TOKEN'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Minimum Received</span>
              <span className="text-white">
                {swapDetails.minimumReceived.toFixed(6)} {swapDirection === 'buy' ? 'TOKEN' : 'USDC'}
              </span>
            </div>
          </div>
        )}
        
        {!connected ? (
          <button className="btn-primary w-full">Connect Wallet</button>
        ) : (
          <button 
            onClick={handleSwap}
            disabled={!swapDetails || isLoading || meteoraLoading || believeAppLoading}
            className={`btn-primary w-full ${(!swapDetails || isLoading || meteoraLoading || believeAppLoading) ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isLoading || meteoraLoading || believeAppLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing
              </span>
            ) : (
              `Swap ${swapDirection === 'buy' ? 'USDC for Tokens' : 'Tokens for USDC'}`
            )}
          </button>
        )}
        
        {txHash && (
          <div className="mt-4 p-3 bg-[#1E2738] rounded-lg">
            <p className="text-sm text-gray-300">Transaction successful!</p>
            <p className="text-xs text-[#0066FF] truncate">TX: {txHash}</p>
          </div>
        )}
      </div>
      
      {/* Pool Stats */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Pool Information</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#1E2738] p-4 rounded-lg">
            <p className="text-gray-400 text-sm mb-1">Token Reserves</p>
            <p className="text-xl font-semibold text-white">
              {poolInfo ? poolInfo.tokenAAmount.toLocaleString() : '0'} TOKEN
            </p>
          </div>
          <div className="bg-[#1E2738] p-4 rounded-lg">
            <p className="text-gray-400 text-sm mb-1">USDC Reserves</p>
            <p className="text-xl font-semibold text-white">
              {poolInfo ? poolInfo.tokenBAmount.toLocaleString() : '0'} USDC
            </p>
          </div>
          <div className="bg-[#1E2738] p-4 rounded-lg">
            <p className="text-gray-400 text-sm mb-1">24h Volume</p>
            <p className="text-xl font-semibold text-white">
              ${poolInfo ? poolInfo.volume24h.toLocaleString() : '0'}
            </p>
          </div>
          <div className="bg-[#1E2738] p-4 rounded-lg">
            <p className="text-gray-400 text-sm mb-1">APR</p>
            <p className="text-xl font-semibold text-green-500">
              {poolInfo ? poolInfo.apr.toFixed(2) : '0'}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TokenSwapPage;
