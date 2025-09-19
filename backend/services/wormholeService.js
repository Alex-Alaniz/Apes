/**
 * Wormhole Service for Cross-Chain Deposits
 * Handles Solana → Polygon bridging without API keys
 */

const wh = require('@wormhole-foundation/sdk');

// Import platform-specific modules
const solana = require('@wormhole-foundation/sdk-solana');
const evm = require('@wormhole-foundation/sdk-evm');

class WormholeService {
  constructor() {
    this.wh = null;
    this.initialized = false;
  }

  /**
   * Initialize Wormhole SDK
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Create Wormhole instance with mainnet configuration
      this.wh = await wh.Wormhole.connectMainnet([solana, evm]);
      
      this.initialized = true;
      console.log('✅ Wormhole SDK initialized successfully');
      
      // Log supported chains for debugging
      const chains = this.wh.getChains();
      console.log('Supported chains:', chains);
      
    } catch (error) {
      console.error('Failed to initialize Wormhole:', error);
      throw error;
    }
  }

  /**
   * Get a quote for bridging tokens
   * @param {Object} params - Bridge parameters
   * @returns {Object} Quote details including fees
   */
  async getQuote(params) {
    await this.initialize();

    const {
      fromChain,
      toChain,
      tokenAddress,
      amount: transferAmount
    } = params;

    try {
      // Get chain contexts
      const sourceContext = this.wh.getChain(fromChain);
      const targetContext = this.wh.getChain(toChain);

      // Create token ID
      const token = { chain: fromChain, address: tokenAddress };
      
      // Get token bridge contracts
      const sourceTb = await sourceContext.getTokenBridge();
      const targetTb = await targetContext.getTokenBridge();

      // Check if token is supported
      const isWrapped = await sourceTb.isWrappedAsset(token.address);
      
      // Calculate fees
      const fee = await sourceTb.getTransferFee();
      
      return {
        supported: true,
        isWrapped,
        fee: fee.toString(),
        estimatedTime: '10-15 minutes',
        route: `${fromChain} → Wormhole → ${toChain}`
      };

    } catch (error) {
      console.error('Quote error:', error);
      return {
        supported: false,
        error: error.message
      };
    }
  }

  /**
   * Execute a token bridge transfer (testnet only for POC)
   * @param {Object} params - Transfer parameters
   * @returns {Object} Transaction details
   */
  async bridgeTokens(params) {
    await this.initialize();

    const {
      signer, // User's wallet signer
      fromChain,
      toChain,
      tokenAddress,
      amount: transferAmount,
      recipientAddress
    } = params;

    try {
      console.log('🌉 Initiating bridge transfer:', {
        from: fromChain,
        to: toChain,
        token: tokenAddress,
        amount: transferAmount
      });

      // Get chain contexts
      const sourceContext = this.wh.getChain(fromChain);
      const targetContext = this.wh.getChain(toChain);

      // Create token transfer
      const tokenTransfer = await this.wh.initiateTransfer(
        sourceContext,
        signer,
        {
          chain: toChain,
          address: recipientAddress
        },
        tokenAddress,
        transferAmount
      );

      console.log('📦 Transfer initiated:', tokenTransfer.txid);

      // Wait for VAA (Verified Action Approval)
      console.log('⏳ Waiting for Wormhole guardians...');
      const vaa = await this.wh.waitForVAA(
        tokenTransfer.txid,
        sourceContext.chain,
        60000 // 60 second timeout
      );

      console.log('✅ VAA obtained:', vaa);

      // Complete transfer on target chain
      // Note: In production, this would be done by relayers or the recipient
      console.log('🎯 Ready to complete on target chain');

      return {
        success: true,
        sourceTxId: tokenTransfer.txid,
        vaa: vaa,
        status: 'pending_redemption',
        message: 'Transfer initiated. Redemption required on target chain.'
      };

    } catch (error) {
      console.error('Bridge error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get supported tokens for a chain
   * @param {string} chain - Chain name
   * @returns {Array} List of supported tokens
   */
  async getSupportedTokens(chain) {
    await this.initialize();

    // Common token addresses
    const tokens = {
      'Solana': [
        {
          symbol: 'USDC',
          address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          decimals: 6
        },
        {
          symbol: 'SOL',
          address: 'So11111111111111111111111111111111111111112',
          decimals: 9
        }
      ],
      'Polygon': [
        {
          symbol: 'USDC',
          address: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
          decimals: 6
        },
        {
          symbol: 'MATIC',
          address: '0x0000000000000000000000000000000000000000',
          decimals: 18
        }
      ]
    };

    return tokens[chain] || [];
  }

  /**
   * Monitor transfer status
   * @param {string} txId - Source transaction ID
   * @param {string} sourceChain - Source chain name
   * @returns {Object} Transfer status
   */
  async getTransferStatus(txId, sourceChain) {
    await this.initialize();

    try {
      const vaa = await this.wh.getVAA(txId, sourceChain);
      
      if (!vaa) {
        return {
          status: 'pending',
          message: 'Waiting for guardian signatures'
        };
      }

      // Check if redeemed on target chain
      // This would require checking target chain state
      
      return {
        status: 'ready_to_redeem',
        vaa: vaa,
        message: 'Transfer ready for redemption on target chain'
      };

    } catch (error) {
      return {
        status: 'error',
        message: error.message
      };
    }
  }
}

module.exports = WormholeService;