// Privy configuration for APES
export const privyConfig = {
  // Basic appearance
  appearance: {
    theme: 'dark',
    accentColor: '#7C3AED',
    logo: '/primape/Asset 1@3x.png'
  },
  
  // Embedded wallets configuration
  embeddedWallets: {
    createOnLogin: 'users-without-wallets',
    requireUserPasswordOnCreate: true,
    showWalletUIs: true
  }
};