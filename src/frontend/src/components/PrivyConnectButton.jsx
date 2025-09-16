import React from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';

function PrivyConnectButton() {
  const { 
    login, 
    logout, 
    authenticated, 
    user,
    ready,
    connectWallet
  } = usePrivy();
  
  const { wallets } = useWallets();
  
  // Find Solana and Polygon wallets
  const solanaWallet = wallets.find(w => w.chainId === 'solana:mainnet');
  const polygonWallet = wallets.find(w => w.chainId.startsWith('eip155:137'));
  
  // Loading state
  if (!ready) {
    return <button className="btn btn-primary" disabled>Loading...</button>;
  }
  
  // Authenticated state
  if (authenticated) {
    return (
      <div className="flex items-center gap-4">
        <div className="text-sm">
          <div className="font-semibold">
            {user?.email || user?.twitter?.username || 'Connected'}
          </div>
          <div className="flex flex-col gap-1 mt-1">
            {solanaWallet && (
              <div className="text-xs text-gray-400">
                Solana: {solanaWallet.address.slice(0, 4)}...{solanaWallet.address.slice(-4)}
              </div>
            )}
            {polygonWallet && (
              <div className="text-xs text-gray-400">
                Polygon: {polygonWallet.address.slice(0, 6)}...{polygonWallet.address.slice(-4)}
              </div>
            )}
            {!solanaWallet && !polygonWallet && (
              <button 
                onClick={connectWallet}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </div>
        <button 
          onClick={logout}
          className="btn btn-secondary btn-sm"
        >
          Disconnect
        </button>
      </div>
    );
  }
  
  // Not authenticated
  return (
    <button 
      onClick={login}
      className="btn btn-primary"
    >
      Connect Wallet
    </button>
  );
}

export default PrivyConnectButton;