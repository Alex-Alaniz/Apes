import { Connection, PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider, web3 } from '@coral-xyz/anchor';
import { usePrivy, useWallets } from '@privy-io/react-auth';

/**
 * Solana wallet integration for APES markets
 * Ensures we use Solana wallets for Solana transactions
 */

// Get Solana provider for Anchor
export async function getSolanaProvider(wallet, connection) {
  if (!wallet) {
    throw new Error('No Solana wallet connected');
  }

  // For Privy Solana wallets
  if (wallet.chainType === 'solana' || wallet.chainId === 'solana:mainnet') {
    // Create a provider that works with Privy's Solana wallet
    const provider = {
      connection,
      wallet: {
        publicKey: new PublicKey(wallet.address),
        signTransaction: async (tx) => {
          // Use Privy's signing method
          const serializedTx = tx.serialize({
            requireAllSignatures: false,
            verifySignatures: false
          });
          
          const signedTx = await wallet.signTransaction(serializedTx);
          return web3.Transaction.from(signedTx);
        },
        signAllTransactions: async (txs) => {
          // Sign multiple transactions
          return Promise.all(txs.map(tx => provider.wallet.signTransaction(tx)));
        }
      }
    };
    
    return new AnchorProvider(
      connection,
      provider.wallet,
      { commitment: 'confirmed' }
    );
  }
  
  // Fallback for standard Solana wallet adapters
  return new AnchorProvider(
    connection,
    wallet,
    { commitment: 'confirmed' }
  );
}

// Hook to get Solana-specific wallet functionality
export function useSolanaWallet() {
  const { wallets } = useWallets();
  
  // Find Solana wallet
  const solanaWallet = wallets.find(w => 
    w.chainType === 'solana' || 
    w.chainId === 'solana:mainnet' ||
    w.walletClientType === 'phantom' ||
    w.walletClientType === 'solflare'
  );
  
  // Get Polygon wallet for Polymarket
  const polygonWallet = wallets.find(w => 
    w.chainType === 'evm' && 
    w.chainId === 'eip155:137'
  );
  
  return {
    solanaWallet,
    polygonWallet,
    hasSolanaWallet: !!solanaWallet,
    hasPolygonWallet: !!polygonWallet,
    
    // Get wallet for specific chain
    getWalletForChain: (chain) => {
      if (chain === 'solana') return solanaWallet;
      if (chain === 'polygon') return polygonWallet;
      return null;
    },
    
    // Connect to Solana
    connectSolana: async () => {
      if (!solanaWallet) {
        throw new Error('No Solana wallet available. Please connect a Solana wallet.');
      }
      
      const connection = new Connection(
        import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'
      );
      
      return {
        connection,
        wallet: solanaWallet,
        publicKey: new PublicKey(solanaWallet.address),
        provider: await getSolanaProvider(solanaWallet, connection)
      };
    }
  };
}

// Ensure we're using Solana wallet for Solana transactions
export function ensureSolanaWallet(wallet) {
  if (!wallet) {
    throw new Error('No wallet connected');
  }
  
  // Check if it's a Solana wallet
  const isSolanaWallet = 
    wallet.chainType === 'solana' || 
    wallet.chainId === 'solana:mainnet' ||
    wallet.walletClientType === 'phantom' ||
    wallet.walletClientType === 'solflare' ||
    (wallet.address && PublicKey.isOnCurve(wallet.address));
  
  if (!isSolanaWallet) {
    throw new Error(
      'Invalid wallet type. Please connect a Solana wallet (Phantom, Solflare, etc.) to interact with APES markets.'
    );
  }
  
  return wallet;
}