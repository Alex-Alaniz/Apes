// Referral Service for Web App
import WalletAuth from '../utils/walletAuth';

export class ReferralService {
  static REFERRAL_KEY = 'primape_referral_code';
  static BASE_URL = 'https://www.primape.app';
  
  /**
   * Get stored referral wallet from localStorage
   */
  static getStoredReferralCode() {
    try {
      return localStorage.getItem(this.REFERRAL_KEY);
    } catch (error) {
      console.error('Error getting stored referral wallet:', error);
      return null;
    }
  }
  
  /**
   * Store referral wallet in localStorage
   */
  static storeReferralCode(referralWallet) {
    try {
      localStorage.setItem(this.REFERRAL_KEY, referralWallet);
      console.log('✅ Stored referral wallet:', referralWallet);
    } catch (error) {
      console.error('Error storing referral wallet:', error);
    }
  }
  
  /**
   * Clear stored referral data
   */
  static clearStoredReferral() {
    try {
      localStorage.removeItem(this.REFERRAL_KEY);
    } catch (error) {
      console.error('Error clearing referral data:', error);
    }
  }
  
  /**
   * Process referral after user connects wallet
   * This should be called after successful wallet connection
   * @param {string} walletAddress - The referred user's wallet address
   * @param {string} backendUrl - Backend API URL
   * @param {object} wallet - Wallet adapter instance for signing
   */
  static async processReferral(walletAddress, backendUrl, wallet) {
    try {
      const referrerWallet = this.getStoredReferralCode();
      if (!referrerWallet) {
        console.log('No referral wallet found');
        return false;
      }
      
      console.log('🎯 Processing referral from wallet:', referrerWallet);
      
      // Send referral to backend with authentication
      const response = await WalletAuth.authenticatedFetch(
        `${backendUrl}/api/referrals/process`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            referralCode: referrerWallet, // This is the referrer's wallet address
            referredWallet: walletAddress,
            sourcePlatform: 'web'
          })
        },
        wallet
      );
      
      if (!response.ok) {
        throw new Error('Failed to process referral');
      }
      
      const result = await response.json();
      
      if (result.success) {
        // Clear stored referral after successful processing
        this.clearStoredReferral();
        console.log('✅ Referral processed successfully');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error processing referral:', error);
      return false;
    }
  }
  
  /**
   * Get referral statistics for a user
   * @param {string} walletAddress - The user's wallet address
   * @param {string} backendUrl - Backend API URL
   * @param {object} wallet - Wallet adapter instance for signing
   */
  static async getReferralStats(walletAddress, backendUrl, wallet) {
    try {
      const response = await WalletAuth.authenticatedFetch(
        `${backendUrl}/api/referrals/stats/${walletAddress}`,
        { method: 'GET' },
        wallet
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch referral stats');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching referral stats:', error);
      return null;
    }
  }
  
  /**
   * Generate referral link using wallet address
   */
  static generateReferralLink(walletAddress) {
    return `${this.BASE_URL}/ref/${walletAddress}`;
  }
  
  /**
   * Share referral link
   */
  static async shareReferralLink(walletAddress, username) {
    const link = this.generateReferralLink(walletAddress);
    const message = username 
      ? `Join me on PRIMAPE! Sign up with my referral link: ${link}`
      : `Join PRIMAPE and start predicting! Use my referral link: ${link}`;
    
    // Try to use Web Share API if available
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join PRIMAPE',
          text: message,
          url: link
        });
        return true;
      } catch (error) {
        // User cancelled or share failed, fall back to clipboard
      }
    }
    
    // Fall back to copying to clipboard
    try {
      await navigator.clipboard.writeText(message);
      return true;
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      return false;
    }
  }
}

export default ReferralService;