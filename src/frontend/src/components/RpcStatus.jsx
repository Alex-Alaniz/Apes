import React, { useState, useEffect } from 'react';
import connectionService from '../services/connectionService';
import { NETWORK } from '../config/solana';

const RpcStatus = () => {
  const [status, setStatus] = useState({ connected: true, rpc: '', network: NETWORK });
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const updateStatus = () => {
      setStatus({
        connected: true,
        rpc: connectionService.getCurrentRpcUrl(),
        network: NETWORK
      });
    };

    updateStatus();
    // Update every 30 seconds
    const interval = setInterval(updateStatus, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const getRpcName = (url) => {
    if (url.includes('devnet.solana.com')) return 'Public Devnet';
    if (url.includes('mainnet-beta.solana.com')) return 'Public Mainnet';
    if (url.includes('alchemy')) return 'Alchemy';
    if (url.includes('helius')) return 'Helius';
    return 'Custom RPC';
  };

  if (!showDetails) {
    return (
      <button
        onClick={() => setShowDetails(true)}
        className="fixed bottom-4 left-4 bg-gray-800 text-gray-400 px-3 py-1 rounded-lg text-xs hover:bg-gray-700"
      >
        {status.network.toUpperCase()} • {getRpcName(status.rpc)}
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 bg-gray-800 rounded-lg p-4 text-sm max-w-sm">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-white">RPC Status</h3>
        <button
          onClick={() => setShowDetails(false)}
          className="text-gray-400 hover:text-white"
        >
          ✕
        </button>
      </div>
      
      <div className="space-y-2 text-gray-300">
        <div>
          <span className="text-gray-500">Network:</span> {status.network}
        </div>
        <div>
          <span className="text-gray-500">RPC:</span> {getRpcName(status.rpc)}
        </div>
        <div className="text-xs text-gray-500 break-all">
          {status.rpc}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-500">Status:</span>
          <span className={`flex items-center gap-1 ${status.connected ? 'text-green-400' : 'text-red-400'}`}>
            <span className="w-2 h-2 rounded-full bg-current"></span>
            {status.connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>
      
      <div className="mt-3 pt-3 border-t border-gray-700 text-xs text-gray-500">
        Using public RPC for better reliability during development
      </div>
    </div>
  );
};

export default RpcStatus; 