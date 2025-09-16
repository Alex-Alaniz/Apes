import React, { useState } from 'react';
import { usePrivy, useWallets, useCreateWallet } from '@privy-io/react-auth';
import { ethers } from 'ethers';

function PrivyTestPage() {
  const { 
    authenticated, 
    user, 
    login, 
    logout, 
    linkWallet,
    unlinkWallet,
    signMessage 
  } = usePrivy();
  
  const { wallets } = useWallets();
  const { createWallet } = useCreateWallet();
  
  const [message, setMessage] = useState('');
  const [signatures, setSignatures] = useState({});
  
  // Find wallets by chain
  const solanaWallet = wallets.find(w => w.chainId === 'solana:mainnet');
  const polygonWallet = wallets.find(w => w.chainId === 'eip155:137');
  const embeddedWallet = wallets.find(w => w.walletClientType === 'privy');
  const externalWallets = wallets.filter(w => w.walletClientType !== 'privy');
  
  const handleLogin = async () => {
    try {
      await login();
    } catch (error) {
      console.error('Login failed:', error);
    }
  };
  
  const handleCreateWallet = async () => {
    try {
      const wallet = await createWallet();
      console.log('Created wallet:', wallet);
    } catch (error) {
      console.error('Failed to create wallet:', error);
    }
  };
  
  const handleLinkWallet = async () => {
    try {
      await linkWallet();
    } catch (error) {
      console.error('Failed to link wallet:', error);
    }
  };
  
  const handleSignMessage = async (wallet) => {
    const messageToSign = `APES Platform Test Message\nTimestamp: ${new Date().toISOString()}`;
    
    try {
      let signature;
      
      if (wallet.chainId.startsWith('eip155')) {
        // EVM wallet (Polygon)
        const provider = await wallet.getEthersProvider();
        const signer = provider.getSigner();
        signature = await signer.signMessage(messageToSign);
      } else if (wallet.chainId === 'solana:mainnet') {
        // Solana wallet
        signature = await wallet.signMessage(new TextEncoder().encode(messageToSign));
        signature = Buffer.from(signature).toString('base64');
      }
      
      setSignatures({
        ...signatures,
        [wallet.address]: signature
      });
      
      setMessage(`Signed with ${wallet.address}`);
    } catch (error) {
      console.error('Failed to sign message:', error);
      setMessage(`Error: ${error.message}`);
    }
  };
  
  const handleSendTransaction = async (wallet) => {
    try {
      if (wallet.chainId === 'eip155:137') {
        // Polygon transaction
        const provider = await wallet.getEthersProvider();
        const signer = provider.getSigner();
        
        const tx = await signer.sendTransaction({
          to: wallet.address, // Send to self for testing
          value: ethers.parseEther('0.0001'), // 0.0001 MATIC
          data: '0x'
        });
        
        console.log('Transaction sent:', tx.hash);
        setMessage(`Polygon TX: ${tx.hash}`);
      } else if (wallet.chainId === 'solana:mainnet') {
        setMessage('Solana transactions not implemented in test');
      }
    } catch (error) {
      console.error('Transaction failed:', error);
      setMessage(`Error: ${error.message}`);
    }
  };
  
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Privy Integration Test</h1>
      
      {/* Authentication Status */}
      <div className="bg-gray-800 p-6 rounded-lg mb-8">
        <h2 className="text-xl font-semibold mb-4">Authentication Status</h2>
        <div className="space-y-2">
          <p>Authenticated: <span className="font-mono">{authenticated ? '✅ Yes' : '❌ No'}</span></p>
          {user && (
            <>
              <p>User ID: <span className="font-mono text-sm">{user.id}</span></p>
              <p>Email: <span className="font-mono">{user.email || 'N/A'}</span></p>
              <p>Twitter: <span className="font-mono">{user.twitter?.username || 'N/A'}</span></p>
              <p>Google: <span className="font-mono">{user.google?.email || 'N/A'}</span></p>
            </>
          )}
        </div>
        
        <div className="mt-4 space-x-4">
          {!authenticated ? (
            <button onClick={handleLogin} className="btn btn-primary">
              Login with Privy
            </button>
          ) : (
            <>
              <button onClick={logout} className="btn btn-secondary">
                Logout
              </button>
              <button onClick={handleCreateWallet} className="btn btn-primary">
                Create New Wallet
              </button>
              <button onClick={handleLinkWallet} className="btn btn-primary">
                Link External Wallet
              </button>
            </>
          )}
        </div>
      </div>
      
      {/* Wallets */}
      {authenticated && (
        <>
          <div className="bg-gray-800 p-6 rounded-lg mb-8">
            <h2 className="text-xl font-semibold mb-4">Connected Wallets ({wallets.length})</h2>
            
            {wallets.length === 0 ? (
              <p className="text-gray-400">No wallets connected. Create or link a wallet above.</p>
            ) : (
              <div className="space-y-4">
                {wallets.map((wallet, index) => (
                  <div key={wallet.address} className="border border-gray-700 rounded p-4">
                    <h3 className="font-semibold mb-2">
                      Wallet #{index + 1} - {wallet.walletClientType === 'privy' ? '🔒 Embedded' : '🔗 External'}
                    </h3>
                    <div className="text-sm space-y-1 font-mono">
                      <p>Address: {wallet.address}</p>
                      <p>Chain: {wallet.chainId}</p>
                      <p>Type: {wallet.walletClientType}</p>
                      <p>Connector: {wallet.connectorType}</p>
                    </div>
                    
                    <div className="mt-3 space-x-2">
                      <button 
                        onClick={() => handleSignMessage(wallet)}
                        className="btn btn-sm btn-primary"
                      >
                        Sign Message
                      </button>
                      
                      {wallet.chainId.startsWith('eip155') && (
                        <button 
                          onClick={() => handleSendTransaction(wallet)}
                          className="btn btn-sm btn-secondary"
                        >
                          Send 0.0001 MATIC
                        </button>
                      )}
                      
                      {wallet.walletClientType !== 'privy' && (
                        <button 
                          onClick={() => unlinkWallet(wallet.address)}
                          className="btn btn-sm btn-danger"
                        >
                          Unlink
                        </button>
                      )}
                    </div>
                    
                    {signatures[wallet.address] && (
                      <div className="mt-3 p-2 bg-gray-900 rounded text-xs break-all">
                        Signature: {signatures[wallet.address].slice(0, 100)}...
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Multi-Chain Status */}
          <div className="bg-gray-800 p-6 rounded-lg mb-8">
            <h2 className="text-xl font-semibold mb-4">Multi-Chain Status</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="border border-gray-700 rounded p-4">
                <h3 className="font-semibold mb-2">Solana (APES)</h3>
                {solanaWallet ? (
                  <div className="text-sm">
                    <p className="text-green-400">✅ Connected</p>
                    <p className="font-mono text-xs mt-1">{solanaWallet.address}</p>
                  </div>
                ) : (
                  <p className="text-yellow-400">⚠️ Not connected</p>
                )}
              </div>
              
              <div className="border border-gray-700 rounded p-4">
                <h3 className="font-semibold mb-2">Polygon (Polymarket)</h3>
                {polygonWallet ? (
                  <div className="text-sm">
                    <p className="text-green-400">✅ Connected</p>
                    <p className="font-mono text-xs mt-1">{polygonWallet.address}</p>
                  </div>
                ) : (
                  <p className="text-yellow-400">⚠️ Not connected</p>
                )}
              </div>
            </div>
          </div>
          
          {/* Messages */}
          {message && (
            <div className="bg-blue-900 p-4 rounded-lg">
              <p className="text-sm">{message}</p>
            </div>
          )}
        </>
      )}
      
      {/* Debug Info */}
      <div className="mt-8 p-4 bg-gray-900 rounded text-xs">
        <h3 className="font-semibold mb-2">Debug Info</h3>
        <pre>{JSON.stringify({ 
          authenticated,
          userLinkedAccounts: user?.linkedAccounts?.map(a => ({ 
            type: a.type, 
            address: a.address?.slice(0, 10) + '...' 
          })),
          walletCount: wallets.length,
          hasEmbedded: !!embeddedWallet,
          externalCount: externalWallets.length
        }, null, 2)}</pre>
      </div>
    </div>
  );
}

export default PrivyTestPage;