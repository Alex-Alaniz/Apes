import React from 'react';
import { useReferralTracking } from '../hooks/useReferralTracking';

const AppWithReferralTracking = ({ children }) => {
  // This hook will handle referral processing when wallet connects
  useReferralTracking();
  
  return <>{children}</>;
};

export default AppWithReferralTracking;