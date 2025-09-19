/**
 * LI.FI Service for Cross-Chain Swaps and Bridge Aggregation
 * Aggregates 20+ bridges and DEXs - NO API KEY REQUIRED
 */

const lifi = require('@lifi/sdk');

class LiFiService {
  constructor() {
    this.initialized = false;
    // Create config for LI.FI
    this.config = lifi.createConfig({
      integrator: 'apes-platform' // Optional identifier
    });
  }

  /**
   * Initialize LI.FI SDK
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Test that LI.FI is working
      const chains = await lifi.getChains();
      console.log(`✅ LI.FI SDK initialized with ${chains.length} chains`);
      
      this.initialized = true;

    } catch (error) {
      console.error('Failed to initialize LI.FI:', error);
      throw error;
    }
  }

  /**
   * Get available chains
   * @returns {Array} List of supported chains
   */
  async getChains() {
    await this.initialize();
    return await lifi.getChains();
  }

  /**
   * Get tokens for a specific chain
   * @param {number} chainId - Chain ID
   * @returns {Array} List of supported tokens
   */
  async getTokens(chainId) {
    await this.initialize();
    const tokens = await lifi.getTokens({ chains: [chainId] });
    return tokens[chainId] || [];
  }

  /**
   * Get quote for cross-chain transfer or swap
   * @param {Object} params - Quote parameters
   * @returns {Object} Best route and quote
   */
  async getQuote(params) {
    await this.initialize();

    const {
      fromChain,
      toChain,
      fromToken,
      toToken,
      fromAmount,
      fromAddress,
      toAddress
    } = params;

    try {
      console.log('🔍 Getting LI.FI quote...', {
        route: `${fromChain} → ${toChain}`,
        tokens: `${fromToken} → ${toToken}`
      });

      // Get route options
      const routeOptions = {
        fromChainId: fromChain,
        fromAmount: fromAmount,
        fromTokenAddress: fromToken,
        toChainId: toChain,
        toTokenAddress: toToken,
        options: {
          slippage: 0.03, // 3% slippage
          infiniteApproval: false,
          allowSwitchChain: false,
          bridges: {
            // Can specify preferred bridges or leave empty for all
            allow: [], // Use all available bridges
            deny: [] // Don't exclude any bridges
          }
        },
        fromAddress: fromAddress || '0x0000000000000000000000000000000000000000',
        toAddress: toAddress || fromAddress || '0x0000000000000000000000000000000000000000'
      };

      const routes = await lifi.getRoutes(routeOptions);

      if (!routes || routes.routes.length === 0) {
        throw new Error('No routes found');
      }

      // Get the best route (first one is usually optimal)
      const bestRoute = routes.routes[0];

      return {
        success: true,
        route: bestRoute,
        summary: {
          fromAmount: fromAmount,
          toAmount: bestRoute.toAmount,
          toAmountMin: bestRoute.toAmountMin,
          gasCost: {
            amount: bestRoute.gasCostUSD || '0',
            token: 'USD'
          },
          executionDuration: bestRoute.approximateDuration || 600, // seconds
          steps: bestRoute.steps.length,
          tools: bestRoute.steps.map(step => step.toolDetails.name).join(' → ')
        },
        quote: {
          rate: (parseFloat(bestRoute.toAmount) / parseFloat(fromAmount)).toFixed(6),
          priceImpact: bestRoute.aggregatedPriceImpact || '0',
          bridges: bestRoute.steps.filter(s => s.type === 'cross').map(s => s.toolDetails.name),
          swaps: bestRoute.steps.filter(s => s.type === 'swap').map(s => s.toolDetails.name)
        }
      };

    } catch (error) {
      console.error('Quote error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get multiple quotes to compare options
   * @param {Object} params - Quote parameters
   * @returns {Array} Multiple route options
   */
  async getMultipleQuotes(params) {
    await this.initialize();

    try {
      const routes = await lifi.getRoutes({
        ...params,
        options: {
          ...params.options,
          maxRoutes: 5 // Get up to 5 different routes
        }
      });

      return routes.routes.map(route => ({
        id: route.id,
        toAmount: route.toAmount,
        gasCostUSD: route.gasCostUSD,
        duration: route.approximateDuration,
        steps: route.steps.length,
        tools: route.steps.map(s => s.toolDetails.name)
      }));

    } catch (error) {
      console.error('Multiple quotes error:', error);
      return [];
    }
  }

  /**
   * Get execution data for a route
   * @param {Object} route - Route object from getQuote
   * @returns {Object} Transaction data for execution
   */
  async getExecutionData(route) {
    await this.initialize();

    try {
      // LI.FI provides transaction data in the route object
      const step = route.steps[0]; // First step
      
      return {
        to: step.transactionRequest.to,
        data: step.transactionRequest.data,
        value: step.transactionRequest.value || '0',
        gasLimit: step.transactionRequest.gasLimit,
        gasPrice: step.transactionRequest.gasPrice
      };

    } catch (error) {
      console.error('Execution data error:', error);
      throw error;
    }
  }

  /**
   * Get status of a cross-chain transaction
   * @param {Object} params - Status parameters
   * @returns {Object} Transaction status
   */
  async getStatus(params) {
    await this.initialize();

    const { txHash, bridge, fromChain, toChain } = params;

    try {
      const status = await lifi.getStatus({
        txHash,
        bridge,
        fromChain,
        toChain
      });

      return {
        status: status.status,
        substatus: status.substatus,
        substatusMessage: status.substatusMessage,
        completed: status.status === 'DONE'
      };

    } catch (error) {
      console.error('Status error:', error);
      return {
        status: 'UNKNOWN',
        error: error.message
      };
    }
  }

  /**
   * Get available bridges between two chains
   * @param {number} fromChain - Source chain ID
   * @param {number} toChain - Destination chain ID
   * @returns {Array} Available bridges
   */
  async getAvailableBridges(fromChain, toChain) {
    await this.initialize();

    try {
      const connections = await lifi.getConnections({
        fromChain,
        toChain
      });

      return connections.connections[0]?.bridges || [];

    } catch (error) {
      console.error('Bridges error:', error);
      return [];
    }
  }
}

module.exports = LiFiService;