import { BN } from '@coral-xyz/anchor';
import { Connection, PublicKey } from '@solana/web3.js';
import { getMint } from '@solana/spl-token';
import { config } from '../config/solana';

// Cache for mint decimals
let cachedDecimals = null;

/**
 * Get token decimals from the mint
 * @param {Connection} connection - Solana connection
 * @param {PublicKey} mintAddress - Token mint address
 * @returns {Promise<number>} Token decimals
 */
export async function getTokenDecimals(connection, mintAddress) {
  try {
    const mint = await getMint(connection, mintAddress);
    return mint.decimals;
  } catch (error) {
    console.error('Error fetching mint decimals:', error);
    // Fallback to config value
    return config.tokenDecimals;
  }
}

/**
 * Get cached decimals or fetch if not available
 * @param {Connection} connection - Solana connection
 * @returns {Promise<number>} Token decimals
 */
export async function getCachedTokenDecimals(connection) {
  if (cachedDecimals === null) {
    // Fetch actual decimals from mint to ensure accuracy
    const mintAddress = new PublicKey(config.tokenMint);
    cachedDecimals = await getTokenDecimals(connection, mintAddress);
    console.log(`Token decimals for ${config.tokenSymbol}: ${cachedDecimals}`);
    
    // Verify against config
    if (cachedDecimals !== config.tokenDecimals) {
      console.error(`⚠️  ERROR: Config decimals (${config.tokenDecimals}) don't match actual mint decimals (${cachedDecimals})!`);
      console.error('This will cause incorrect token amounts. Please update the config.');
    }
  }
  return cachedDecimals;
}

/**
 * Convert UI amount to token units (lamports)
 * @param {string|number} uiAmount - Amount as shown in UI
 * @param {number} decimals - Token decimals
 * @returns {BN} Amount in smallest token units
 */
export function uiToUnits(uiAmount, decimals) {
  const amount = typeof uiAmount === 'string' ? parseFloat(uiAmount) : uiAmount;
  if (isNaN(amount) || amount < 0) {
    throw new Error('Invalid amount');
  }
  
  // Convert to smallest units
  const units = Math.floor(amount * Math.pow(10, decimals));
  return new BN(units);
}

/**
 * Convert token units (lamports) to UI amount
 * @param {BN|number|string} units - Amount in smallest token units
 * @param {number} decimals - Token decimals
 * @returns {number} Amount for UI display
 */
export function unitsToUi(units, decimals) {
  let bnUnits;
  if (BN.isBN(units)) {
    bnUnits = units;
  } else {
    bnUnits = new BN(units.toString());
  }
  
  const divisor = new BN(10).pow(new BN(decimals));
  const quotient = bnUnits.div(divisor);
  const remainder = bnUnits.mod(divisor);
  
  // Convert to number with decimals
  const wholeNumber = quotient.toNumber();
  const fraction = remainder.toNumber() / Math.pow(10, decimals);
  
  return wholeNumber + fraction;
}

/**
 * Format token amount for display
 * @param {number} amount - UI amount
 * @param {string} symbol - Token symbol
 * @param {number} displayDecimals - Number of decimals to show (default 2)
 * @returns {string} Formatted amount with symbol
 */
export function formatTokenAmount(amount, symbol = config.tokenSymbol, displayDecimals = 2) {
  return `${amount.toFixed(displayDecimals)} ${symbol}`;
}

// Clear cache when network changes
export function clearDecimalsCache() {
  cachedDecimals = null;
} 