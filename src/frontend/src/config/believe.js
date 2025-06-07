// Believe API Configuration
export const BELIEVE_CONFIG = {
  // API Configuration
  apiKey: import.meta.env.VITE_BELIEVE_API_KEY || '0af81c5f-74fa-4c2e-a9f3-839b9d00afb3',
  apiUrl: import.meta.env.VITE_BELIEVE_API_URL || 'https://public.believe.app/v1',
  
  // Enable burns - we have PREDICTION_PLACED configured
  enabled: true,
  
  // Fixed burn amounts for different actions
  burnAmounts: {
    PREDICTION_BET: 1,      // 1 APES for placing a prediction
    PREDICTION_CLAIM: 1,    // 1 APES for claiming rewards
    MARKET_CREATION: 5      // 5 APES for creating a market
  },
  
  // Proof types configured in Believe
  proofTypes: {
    PREDICTION_BET: 'PREDICTION_PLACED',      // Already configured
    PREDICTION_CLAIM: 'PREDICTION_CLAIMED',   // To be added to schema
    MARKET_CREATION: 'MARKET_CREATED'         // To be added to schema
  }
};

// Check if Believe API is configured and enabled
export const isBelieveConfigured = () => {
  return BELIEVE_CONFIG.enabled && !!BELIEVE_CONFIG.apiKey && !!BELIEVE_CONFIG.apiUrl;
}; 