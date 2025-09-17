import React from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useSolanaWallet } from '../utils/solanaWalletIntegration';

export default function DebugWalletInfo() {
  const { wallets } = useWallets();
  const { solanaWallet } = useSolanaWallet();
  const { user, authenticated } = usePrivy();
  
  if (!authenticated) {
    return <div className="p-4 bg-gray-800 text-white">Not authenticated</div>;
  }
  
  return (
    <div className="p-4 bg-gray-800 text-white space-y-4 overflow-auto">
      <h3 className="text-lg font-bold">Debug: Wallet Information</h3>
      
      <div>
        <h4 className="font-semibold">User Info:</h4>
        <pre className="text-xs bg-gray-900 p-2 rounded">
          {JSON.stringify(user, null, 2)}
        </pre>
      </div>
      
      <div>
        <h4 className="font-semibold">All Wallets from Privy:</h4>
        {wallets.map((wallet, index) => (
          <div key={index} className="mb-2 bg-gray-900 p-2 rounded">
            <p className="text-sm font-mono">Wallet {index + 1}:</p>
            <pre className="text-xs overflow-x-auto">
              {JSON.stringify({
                address: wallet.address,
                chainId: wallet.chainId,
                chainType: wallet.chainType,
                walletClientType: wallet.walletClientType,
                connectorType: wallet.connectorType,
                imported: wallet.imported,
                verified: wallet.verified,
                // Check if it has Solana-specific properties
                hasSignTransaction: !!wallet.signTransaction,
                hasSignMessage: !!wallet.signMessage,
                hasGetEthersProvider: !!wallet.getEthersProvider,
                // Check window.phantom
                windowPhantomExists: !!window.phantom?.solana,
                windowPhantomConnected: window.phantom?.solana?.isConnected
              }, null, 2)}
            </pre>
          </div>
        ))}
      </div>
      
      <div>
        <h4 className="font-semibold">Detected Solana Wallet:</h4>
        <pre className="text-xs bg-gray-900 p-2 rounded">
          {solanaWallet ? JSON.stringify({
            address: solanaWallet.address || solanaWallet.publicKey?.toString(),
            type: solanaWallet.walletClientType || 'standard-adapter'
          }, null, 2) : 'No Solana wallet detected'}
        </pre>
      </div>
      
      <div>
        <h4 className="font-semibold">Window Objects:</h4>
        <pre className="text-xs bg-gray-900 p-2 rounded">
          {JSON.stringify({
            'window.phantom': !!window.phantom,
            'window.phantom.solana': !!window.phantom?.solana,
            'window.phantom.ethereum': !!window.phantom?.ethereum,
            'window.solana': !!window.solana,
            'window.solflare': !!window.solflare
          }, null, 2)}
        </pre>
      </div>
    </div>
  );
}