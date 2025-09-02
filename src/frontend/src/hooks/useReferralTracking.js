import { useEffect, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { toast } from 'react-hot-toast';
import ReferralService from '../services/referralService';

export const useReferralTracking = () => {
  const { publicKey, connected } = useWallet();
  const wallet = useWallet();
  const hasProcessedRef = useRef(false);
  
  useEffect(() => {
    const processReferralIfNeeded = async () => {
      // Only process once per wallet connection
      if (!connected || !publicKey || hasProcessedRef.current) {
        return;
      }
      
      const walletAddress = publicKey.toString();
      const referralCode = ReferralService.getStoredReferralCode();
      
      if (referralCode) {
        console.log('🎯 Processing referral for wallet:', walletAddress);
        
        try {
          // Get backend URL from environment or use default
          const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://apes-production.up.railway.app';
          
          const success = await ReferralService.processReferral(walletAddress, backendUrl, wallet);
          
          if (success) {
            toast.success('Referral activated! You\'re now connected to your referrer.', {
              duration: 5000,
              style: {
                background: '#10B981',
                color: '#FFFFFF',
              },
            });
            hasProcessedRef.current = true;
          }
        } catch (error) {
          console.error('Error processing referral:', error);
          toast.error('Failed to process referral. Please try again later.');
        }
      }
    };
    
    processReferralIfNeeded();
  }, [connected, publicKey]);
  
  // Reset when wallet disconnects
  useEffect(() => {
    if (!connected) {
      hasProcessedRef.current = false;
    }
  }, [connected]);
};