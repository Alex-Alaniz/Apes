import { Connection, PublicKey } from '@solana/web3.js';
import { getRpcUrl } from '../config/solana';

const APES_PROGRAM = 'APESCaeLW5RuxNnpNARtDZnSgeVFC5f37Z3VFNKupJUS';

/**
 * Calculate the escrow PDA for a market
 */
export const getEscrowPDA = async (marketAddress) => {
  const marketPubkey = new PublicKey(marketAddress);
  const escrowSeeds = [
    Buffer.from('market_escrow'),
    marketPubkey.toBuffer()
  ];
  
  const [escrowPubkey] = await PublicKey.findProgramAddress(
    escrowSeeds,
    new PublicKey(APES_PROGRAM)
  );
  
  return escrowPubkey;
};

/**
 * Fetch the real market volume from the escrow account
 * @param {string} marketAddress - The market public key
 * @returns {Promise<{success: boolean, volume: number, escrowAddress: string, error?: string}>}
 */
export const fetchEscrowVolume = async (marketAddress) => {
  try {
    const rpcUrl = getRpcUrl();
    console.log(`🔍 Fetching escrow volume for market ${marketAddress}`);
    console.log(`📡 Using RPC: ${rpcUrl}`);
    
    const connection = new Connection(rpcUrl, 'confirmed');
    
    // Calculate escrow PDA
    const escrowPubkey = await getEscrowPDA(marketAddress);
    console.log(`🔑 Escrow PDA: ${escrowPubkey.toString()}`);
    
    // Get escrow token balance
    const escrowTokenInfo = await connection.getParsedAccountInfo(escrowPubkey);
    
    if (!escrowTokenInfo.value || !escrowTokenInfo.value.data || !('parsed' in escrowTokenInfo.value.data)) {
      console.log('❌ Escrow account not found or not a valid token account');
      return {
        success: false,
        volume: 0,
        escrowAddress: escrowPubkey.toString(),
        error: 'Escrow account not found or not a valid token account'
      };
    }
    
    const parsed = escrowTokenInfo.value.data.parsed;
    const escrowBalance = parseFloat(parsed.info.tokenAmount.uiAmount);
    
    console.log(`✅ Escrow balance for ${marketAddress}: ${escrowBalance} APES`);
    
    return {
      success: true,
      volume: escrowBalance,
      escrowAddress: escrowPubkey.toString(),
      decimals: parsed.info.tokenAmount.decimals,
      rawAmount: parsed.info.tokenAmount.amount
    };
    
  } catch (error) {
    console.error('❌ Error fetching escrow volume:', error);
    return {
      success: false,
      volume: 0,
      error: error.message
    };
  }
};

/**
 * Fetch escrow volumes for multiple markets in parallel
 * @param {string[]} marketAddresses - Array of market public keys
 * @returns {Promise<Map<string, number>>} Map of market address to volume
 */
export const fetchMultipleEscrowVolumes = async (marketAddresses) => {
  const volumeMap = new Map();
  
  try {
    const rpcUrl = getRpcUrl();
    console.log(`🔍 Fetching escrow volumes for ${marketAddresses.length} markets`);
    console.log(`📡 Using RPC: ${rpcUrl}`);
    
    const connection = new Connection(rpcUrl, 'confirmed');
    
    // Fetch all escrow accounts in parallel
    const promises = marketAddresses.map(async (marketAddress) => {
      try {
        const escrowPubkey = await getEscrowPDA(marketAddress);
        const escrowTokenInfo = await connection.getParsedAccountInfo(escrowPubkey);
        
        if (escrowTokenInfo.value && escrowTokenInfo.value.data && 'parsed' in escrowTokenInfo.value.data) {
          const parsed = escrowTokenInfo.value.data.parsed;
          const escrowBalance = parseFloat(parsed.info.tokenAmount.uiAmount);
          volumeMap.set(marketAddress, escrowBalance);
          console.log(`✅ Market ${marketAddress}: ${escrowBalance} APES`);
        } else {
          volumeMap.set(marketAddress, 0);
          console.log(`❌ Market ${marketAddress}: No escrow data`);
        }
      } catch (error) {
        console.error(`❌ Error fetching escrow for ${marketAddress}:`, error.message);
        volumeMap.set(marketAddress, 0);
      }
    });
    
    await Promise.all(promises);
    console.log(`✅ Fetched ${volumeMap.size} escrow volumes`);
    
  } catch (error) {
    console.error('❌ Error fetching multiple escrow volumes:', error);
  }
  
  return volumeMap;
}; 