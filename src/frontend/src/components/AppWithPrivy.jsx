import React from 'react';
import { PrivyProvider } from '@privy-io/react-auth';
import { privyConfig } from '../config/privy';
import App from '../App';

function AppWithPrivy() {
  return (
    <PrivyProvider
      appId={privyConfig.appId}
      config={privyConfig.config}
      onSuccess={(user) => {
        console.log('Privy login success:', user);
        // Check for multi-chain wallets
        const hasPolygonWallet = user.linkedAccounts?.some(
          account => account.type === 'wallet' && account.chainId === '0x89'
        );
        const hasSolanaWallet = user.linkedAccounts?.some(
          account => account.type === 'solana'
        );
        
        console.log('Wallet status:', {
          polygon: hasPolygonWallet,
          solana: hasSolanaWallet
        });
      }}
    >
      <App />
    </PrivyProvider>
  );
}

export default AppWithPrivy;