import { PublicKey } from '@solana/web3.js';

// Set the current network (can be changed via environment variable)
let NETWORK = 'devnet';
try {
  NETWORK = import.meta.env?.VITE_SOLANA_NETWORK || 'devnet';
} catch (e) {
  console.log('Using default network: devnet');
}

export { NETWORK };

// RPC and WebSocket endpoints with fallbacks
const RPC_ENDPOINTS = {
  devnet: [
    'https://api.devnet.solana.com',  // Public RPC (primary for development)
    'https://solana-devnet.g.alchemy.com/v2/9CAX-rCmJaz4aUIzPCSML',  // Alchemy (backup)
    'https://devnet.helius-rpc.com',  // Helius public
  ],
  mainnet: [
    'https://solana-mainnet.g.alchemy.com/v2/LB4s_CFb80irvbKFWL6qN',  // Alchemy (primary) - Higher rate limits
    'https://mainnet.helius-rpc.com/?api-key=4a7d2ddd-3e83-4265-a9fb-0e4a5b51fd6d',  // Helius (backup)
    'https://api.mainnet-beta.solana.com',  // Public RPC (fallback)
  ]
};

// WebSocket endpoints for real-time updates
const WS_ENDPOINTS = {
  devnet: [
    'wss://api.devnet.solana.com',
    'wss://devnet.helius-rpc.com/?api-key=4a7d2ddd-3e83-4265-a9fb-0e4a5b51fd6d',
  ],
  mainnet: [
    'wss://api.mainnet-beta.solana.com',  // Public WebSocket (primary) - No rate limits
    'wss://mainnet.helius-rpc.com/?api-key=4a7d2ddd-3e83-4265-a9fb-0e4a5b51fd6d',  // Helius (backup)
  ]
};

// Get primary RPC URL
const getPrimaryRpc = (network) => RPC_ENDPOINTS[network][0];
const getPrimaryWs = (network) => WS_ENDPOINTS[network][0];

// Enhanced network configuration with WebSocket support
export const NETWORK_CONFIG = {
  devnet: {
    rpcUrl: getPrimaryRpc('devnet'),
    wsUrl: getPrimaryWs('devnet'),
    rpcEndpoints: RPC_ENDPOINTS.devnet,  // All available endpoints
    wsEndpoints: WS_ENDPOINTS.devnet,    // All WebSocket endpoints
    name: "Devnet",
    programId: "F3cFKHXtoYeTnKE6hd7iy21oAZFGyz7dm2WQKS31M46Y",  // Current devnet program
    tokenMint: "JDgVjm6Sw2tc2mg13RH15AnUUGWoRadRX4Zb69AVNGWb",  // Devnet APES (6 decimals)
    tokenSymbol: "APES",
    tokenDecimals: 6,  // Devnet APES has 6 decimals
    tokenName: "PRIMAPE",
    // Fresh deployment treasuries
    platformFeeAddress: "APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z", // PRIMAPE Treasury
    treasuryAddress: "APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z", // Legacy field
    primeapeTreasury: "APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z", // PRIMAPE Treasury (contract fees)
    communityTreasury: "APESxbwPNyJW62vSY83zENJwoL2gXJ8HbpMBPWwJKGi2" // Community Treasury (platform fees)
  },
  mainnet: {
    programId: "APESCaeLW5RuxNnpNARtDZnSgeVFC5f37Z3VFNKupJUS", // ✅ APES Program ID - LIVE on Mainnet
    tokenMint: "9BZJXtmfPpkHnM57gHEx5Pc9oQhLhJtr4mhCsNtttTts", // Live APES token
    tokenName: "PRIMAPE",
    tokenSymbol: "APES",
    tokenDecimals: 9,  // Mainnet APES has 9 decimals (standard)
    name: "Mainnet",
    rpcUrl: getPrimaryRpc('mainnet'),
    wsUrl: getPrimaryWs('mainnet'),
    rpcEndpoints: RPC_ENDPOINTS.mainnet,  // All available endpoints
    wsEndpoints: WS_ENDPOINTS.mainnet,    // All WebSocket endpoints
    // Production settings
    commitment: "confirmed",  // Balance between speed and finality
    confirmTransactionInitialTimeout: 60000,  // 60 seconds for mainnet
    // Treasury configuration - all fees go to PRIMAPE Treasury initially
    platformFeeAddress: "APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z", // PRIMAPE Treasury (all fees)
    treasuryAddress: "APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z", // Main treasury used by smart contract
    primeapeTreasury: "APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z", // PRIMAPE Treasury (operational control)
    communityTreasury: "APESxbwPNyJW62vSY83zENJwoL2gXJ8HbpMBPWwJKGi2" // Community Treasury (for distributions)
  }
};

// Get configuration for current network
export const config = NETWORK_CONFIG[NETWORK];

// Export commonly used values
export const PROGRAM_ID = new PublicKey(config.programId);
export const TOKEN_MINT = new PublicKey(config.tokenMint);
export const RPC_URL = config.rpcUrl;
export const WS_URL = config.wsUrl;

// Treasury addresses
export const PRIMAPE_TREASURY = new PublicKey(config.primeapeTreasury);
export const COMMUNITY_TREASURY = new PublicKey(config.communityTreasury);

// Helper to get the correct RPC endpoint
export const getRpcUrl = () => {
  return config.rpcUrl;
};

// Helper to get the correct WebSocket endpoint
export const getWsUrl = () => {
  return config.wsUrl;
};

// Helper to get all RPC endpoints for fallback
export const getAllRpcUrls = () => {
  return config.rpcEndpoints || [config.rpcUrl];
};

// Helper to get all WebSocket endpoints for fallback
export const getAllWsUrls = () => {
  return config.wsEndpoints || [config.wsUrl];
};

// Helper to get network-specific explorer URL
export const getExplorerUrl = (signature) => {
  const cluster = NETWORK === 'mainnet' ? '' : `?cluster=${NETWORK}`;
  return `https://explorer.solana.com/tx/${signature}${cluster}`;
};

// Helper to get connection configuration for the current network
export const getConnectionConfig = () => {
  return {
    commitment: config.commitment || 'confirmed',
    confirmTransactionInitialTimeout: config.confirmTransactionInitialTimeout || 30000,
    wsEndpoint: config.wsUrl,
  };
}; 