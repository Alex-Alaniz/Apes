import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { AnchorProvider } from '@coral-xyz/anchor';

/**
 * Creates a Solana wallet adapter from a Privy wallet
 * This ensures compatibility with Anchor and Solana web3.js
 */
export function createPrivySolanaAdapter(privyWallet, connection) {
  if (!privyWallet) {
    throw new Error('No Privy wallet provided');
  }

  // Check if this is actually a Solana wallet by checking the address format
  const isSolanaAddress = (address) => {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  };

  if (!isSolanaAddress(privyWallet.address)) {
    throw new Error(`Wallet ${privyWallet.address} is not a valid Solana address. This appears to be an EVM wallet.`);
  }

  console.log('Creating Privy Solana adapter for wallet:', {
    address: privyWallet.address,
    walletClientType: privyWallet.walletClientType,
    chainType: privyWallet.chainType
  });

  // Create an adapter that works with both Privy and standard Solana tools
  const adapter = {
    publicKey: new PublicKey(privyWallet.address),
    
    signTransaction: async (transaction) => {
      if (!transaction) throw new Error('Transaction is required');
      
      try {
        // Serialize the transaction for Privy
        const serialized = transaction.serialize({
          requireAllSignatures: false,
          verifySignatures: false
        });
        
        // Use Privy's signTransaction method
        if (privyWallet.signTransaction) {
          const signedData = await privyWallet.signTransaction(serialized);
          
          // Deserialize the signed transaction
          return Transaction.from(signedData);
        } else if (privyWallet.signAndSendTransaction) {
          // Some Privy wallets might only support signAndSend
          throw new Error('This wallet only supports signAndSendTransaction. Please use the appropriate method.');
        } else {
          throw new Error('Wallet does not support transaction signing');
        }
      } catch (error) {
        console.error('Error signing transaction with Privy wallet:', error);
        throw error;
      }
    },
    
    signAllTransactions: async (transactions) => {
      // Sign each transaction individually
      return Promise.all(
        transactions.map(tx => adapter.signTransaction(tx))
      );
    },
    
    signMessage: async (message) => {
      if (privyWallet.signMessage) {
        return await privyWallet.signMessage(message);
      }
      throw new Error('Wallet does not support message signing');
    },
    
    // Additional properties that might be needed
    connected: true,
    connecting: false,
    disconnecting: false,
    
    // Methods that might be called
    connect: async () => {
      // Already connected through Privy
      return;
    },
    
    disconnect: async () => {
      // Handled by Privy logout
      throw new Error('Use Privy logout to disconnect');
    }
  };
  
  return adapter;
}

/**
 * Creates an Anchor provider from a Privy Solana wallet
 */
export function createPrivyAnchorProvider(privyWallet, connection) {
  const adapter = createPrivySolanaAdapter(privyWallet, connection);
  
  return new AnchorProvider(
    connection,
    adapter,
    { commitment: 'confirmed' }
  );
}

/**
 * Detects if a Privy wallet is a Solana wallet
 */
export function isPrivySolanaWallet(wallet) {
  if (!wallet) return false;
  
  // Method 1: Check if address is a valid Solana address
  try {
    new PublicKey(wallet.address);
    
    // Additional check: Solana addresses are base58 encoded and 32-44 chars
    if (wallet.address.length >= 32 && wallet.address.length <= 44) {
      // Check if it doesn't start with 0x (which would be EVM)
      if (!wallet.address.startsWith('0x')) {
        return true;
      }
    }
  } catch {
    // Not a valid Solana public key
  }
  
  // Method 2: Check wallet client type
  const solanaWalletTypes = ['phantom', 'solflare', 'backpack', 'glow', 'slope'];
  if (solanaWalletTypes.includes(wallet.walletClientType?.toLowerCase())) {
    return true;
  }
  
  // Method 3: Check chain type/ID
  if (wallet.chainType === 'solana' || wallet.chainId === 'solana:mainnet') {
    return true;
  }
  
  // Method 4: Check if it has Solana-specific methods
  if (wallet.signTransaction && !wallet.getEthersProvider) {
    return true;
  }
  
  return false;
}