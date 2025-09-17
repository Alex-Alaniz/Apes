const { PrivyClient } = require('@privy-io/server-auth');

/**
 * Server-side Privy wallet service
 * Handles EVM wallet operations for Polymarket integration
 * 
 * Based on: https://docs.privy.io/wallets/wallets/server-side-access
 */
class PrivyWalletService {
  constructor() {
    this.privy = new PrivyClient(
      process.env.PRIVY_APP_ID,
      process.env.PRIVY_APP_SECRET
    );
  }

  /**
   * Get user's EVM wallet for Polygon/Polymarket operations
   * This should ONLY be used server-side
   */
  async getUserPolygonWallet(userId) {
    try {
      const user = await this.privy.getUser(userId);
      
      if (!user) {
        throw new Error('User not found');
      }
      
      // Find Polygon wallet (chainId: eip155:137)
      const polygonWallet = user.linkedAccounts?.find(account => 
        account.type === 'wallet' && 
        account.chainId === 'eip155:137'
      );
      
      if (!polygonWallet) {
        // User doesn't have a Polygon wallet yet
        // They may have only connected Solana for frontend
        return null;
      }
      
      return {
        address: polygonWallet.address,
        chainId: polygonWallet.chainId,
        walletClient: polygonWallet.walletClient,
        // Note: We can't sign transactions server-side
        // User must sign through Privy UI when needed
      };
    } catch (error) {
      console.error('Error fetching user Polygon wallet:', error);
      throw error;
    }
  }
  
  /**
   * Create embedded EVM wallet for user (server-side only)
   * This creates a wallet that can be used for Polymarket
   */
  async createEmbeddedPolygonWallet(userId) {
    try {
      // This requires special Privy configuration
      // Embedded wallets must be enabled in Privy dashboard
      const user = await this.privy.getUser(userId);
      
      if (!user) {
        throw new Error('User not found');
      }
      
      // Check if user already has a Polygon wallet
      const existingWallet = await this.getUserPolygonWallet(userId);
      if (existingWallet) {
        return existingWallet;
      }
      
      // Note: Actual wallet creation happens client-side
      // Server can only check if wallet exists
      throw new Error('EVM wallet creation must be done client-side for security');
    } catch (error) {
      console.error('Error creating embedded wallet:', error);
      throw error;
    }
  }
  
  /**
   * Verify user owns a specific Solana wallet
   * Used for authentication/authorization
   */
  async verifySolanaWalletOwnership(userId, solanaAddress) {
    try {
      const user = await this.privy.getUser(userId);
      
      if (!user) {
        return false;
      }
      
      // Check linked accounts for Solana wallet
      const hasSolanaWallet = user.linkedAccounts?.some(account => 
        account.type === 'wallet' && 
        account.address === solanaAddress &&
        (account.chainType === 'solana' || !account.chainId?.startsWith('eip155'))
      );
      
      return hasSolanaWallet;
    } catch (error) {
      console.error('Error verifying wallet ownership:', error);
      return false;
    }
  }
  
  /**
   * Get user by Solana wallet address
   * Useful for looking up users by their wallet
   */
  async getUserBySolanaWallet(solanaAddress) {
    try {
      // Note: This requires querying all users which might not scale
      // Consider maintaining a separate mapping in your database
      
      // For now, return null - implement based on your needs
      return null;
    } catch (error) {
      console.error('Error fetching user by wallet:', error);
      return null;
    }
  }
}

module.exports = new PrivyWalletService();