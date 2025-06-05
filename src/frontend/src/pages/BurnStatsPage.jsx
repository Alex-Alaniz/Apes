import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import useBelieveApp from '../utils/useBelieveApp';

const BurnStatsPage = () => {
  const { connected, publicKey } = useWallet();
  const { getTokenBurnStats, isProcessing } = useBelieveApp();
  const [burnStats, setBurnStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('all');

  useEffect(() => {
    fetchBurnStats();
  }, [timeframe]);

  const fetchBurnStats = async () => {
    try {
      setIsLoading(true);
      const stats = await getTokenBurnStats();
      setBurnStats(stats);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching burn stats:', error);
      setIsLoading(false);
    }
  };

  if (isLoading || isProcessing) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#00A3FF]"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-8">Token Burn Statistics</h1>
      
      {/* Timeframe Selector */}
      <div className="flex justify-end mb-6">
        <div className="flex space-x-2">
          <button 
            onClick={() => setTimeframe('day')}
            className={`px-3 py-1 rounded text-sm ${timeframe === 'day' ? 'bg-[#0066FF] text-white' : 'bg-[#1E2738] text-gray-300'}`}
          >
            24H
          </button>
          <button 
            onClick={() => setTimeframe('week')}
            className={`px-3 py-1 rounded text-sm ${timeframe === 'week' ? 'bg-[#0066FF] text-white' : 'bg-[#1E2738] text-gray-300'}`}
          >
            7D
          </button>
          <button 
            onClick={() => setTimeframe('month')}
            className={`px-3 py-1 rounded text-sm ${timeframe === 'month' ? 'bg-[#0066FF] text-white' : 'bg-[#1E2738] text-gray-300'}`}
          >
            30D
          </button>
          <button 
            onClick={() => setTimeframe('all')}
            className={`px-3 py-1 rounded text-sm ${timeframe === 'all' ? 'bg-[#0066FF] text-white' : 'bg-[#1E2738] text-gray-300'}`}
          >
            All Time
          </button>
        </div>
      </div>
      
      {burnStats && (
        <>
          {/* Total Burned */}
          <div className="card mb-8">
            <h2 className="text-xl font-semibold mb-4">Total Tokens Burned</h2>
            <div className="flex items-end gap-4">
              <p className="text-4xl font-bold text-white">{burnStats.totalBurned.toLocaleString()}</p>
              <p className="text-lg text-green-500 mb-1">+2.5% from previous period</p>
            </div>
          </div>
          
          {/* Burn Distribution */}
          <div className="card mb-8">
            <h2 className="text-xl font-semibold mb-4">Burn Distribution by Type</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[#1E2738] p-4 rounded-lg">
                <p className="text-gray-400 text-sm mb-1">Prediction Bets</p>
                <p className="text-2xl font-semibold text-white">{burnStats.burnsByType.PREDICTION_BET.toLocaleString()}</p>
                <p className="text-sm text-gray-400">{((burnStats.burnsByType.PREDICTION_BET / burnStats.totalBurned) * 100).toFixed(1)}% of total</p>
              </div>
              <div className="bg-[#1E2738] p-4 rounded-lg">
                <p className="text-gray-400 text-sm mb-1">Reward Claims</p>
                <p className="text-2xl font-semibold text-white">{burnStats.burnsByType.PREDICTION_CLAIM.toLocaleString()}</p>
                <p className="text-sm text-gray-400">{((burnStats.burnsByType.PREDICTION_CLAIM / burnStats.totalBurned) * 100).toFixed(1)}% of total</p>
              </div>
              <div className="bg-[#1E2738] p-4 rounded-lg">
                <p className="text-gray-400 text-sm mb-1">Market Creation</p>
                <p className="text-2xl font-semibold text-white">{burnStats.burnsByType.MARKET_CREATION.toLocaleString()}</p>
                <p className="text-sm text-gray-400">{((burnStats.burnsByType.MARKET_CREATION / burnStats.totalBurned) * 100).toFixed(1)}% of total</p>
              </div>
            </div>
          </div>
          
          {/* Burn Chart Placeholder */}
          <div className="card mb-8">
            <h2 className="text-xl font-semibold mb-4">Burn Rate Over Time</h2>
            <div className="bg-[#1E2738] h-64 rounded-lg flex items-center justify-center">
              <p className="text-gray-400">Burn Rate Chart (would be implemented with Chart.js)</p>
            </div>
          </div>
          
          {/* Recent Burns */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Recent Burns</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-[#2A3548]">
                    <th className="pb-2">Type</th>
                    <th className="pb-2">Amount</th>
                    <th className="pb-2">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {burnStats.recentBurns.map((burn, index) => (
                    <tr key={index} className="border-b border-[#2A3548]">
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          burn.type === 'PREDICTION_BET' ? 'bg-blue-900 text-blue-300' :
                          burn.type === 'PREDICTION_CLAIM' ? 'bg-green-900 text-green-300' :
                          'bg-purple-900 text-purple-300'
                        }`}>
                          {burn.type === 'PREDICTION_BET' ? 'Bet' :
                           burn.type === 'PREDICTION_CLAIM' ? 'Claim' : 'Market'}
                        </span>
                      </td>
                      <td className="py-3">{burn.amount.toLocaleString()} tokens</td>
                      <td className="py-3 text-gray-400">
                        {new Date(burn.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default BurnStatsPage;
