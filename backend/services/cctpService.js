/**
 * Circle CCTP Service for USDC Bridging
 * Native USDC transfers without wrapped tokens
 * NO API KEYS REQUIRED - Direct contract interaction
 */

const { ethers } = require('ethers');
const { Connection, PublicKey } = require('@solana/web3.js');

// CCTP Contract Addresses (Mainnet)
const CCTP_CONTRACTS = {
  // Ethereum
  1: {
    tokenMessenger: '0xBd3fa81B58Ba92a82136038B25aDec7066af3155',
    messageTransmitter: '0x0a992d191DEeC32aFe36203Ad87D7d289a738F81',
    usdc: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
  },
  // Polygon
  137: {
    tokenMessenger: '0x9daF8c91AEFAE50b9c0E69629D3F6Ca40cA3B3FE',
    messageTransmitter: '0xF3be9355363857F3e001be68856A2f96b4C39Ba9',
    usdc: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'
  },
  // Arbitrum
  42161: {
    tokenMessenger: '0x19330d10D9Cc8751218eaf51E8885D058642E08A',
    messageTransmitter: '0xC30362313FBBA5cf9163F0bb16a0e01f01A896ca',
    usdc: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
  }
};

// Chain IDs for CCTP
const CCTP_DOMAINS = {
  1: 0,     // Ethereum
  137: 7,   // Polygon
  42161: 3, // Arbitrum
  101: 5    // Solana
};

// Minimal ABI for TokenMessenger contract
const TOKEN_MESSENGER_ABI = [
  'function depositForBurn(uint256 amount, uint32 destinationDomain, bytes32 mintRecipient, address burnToken) returns (uint64 nonce)',
  'function depositForBurnWithCaller(uint256 amount, uint32 destinationDomain, bytes32 mintRecipient, address burnToken, bytes32 destinationCaller) returns (uint64 nonce)',
  'event DepositForBurn(uint64 indexed nonce, address indexed burnToken, uint256 amount, address indexed depositor, bytes32 mintRecipient, uint32 destinationDomain, bytes32 destinationCaller)'
];

// Minimal ABI for USDC contract
const USDC_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)'
];

class CCTPService {
  constructor() {
    this.providers = {};
    this.initialized = false;
  }

  /**
   * Initialize providers for supported chains
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Initialize EVM providers (using public RPCs for POC)
      this.providers[1] = new ethers.providers.JsonRpcProvider('https://eth.llamarpc.com');
      this.providers[137] = new ethers.providers.JsonRpcProvider('https://polygon-rpc.com');
      this.providers[42161] = new ethers.providers.JsonRpcProvider('https://arb1.arbitrum.io/rpc');
      
      // Initialize Solana connection
      this.solanaConnection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');

      this.initialized = true;
      console.log('✅ CCTP Service initialized');
    } catch (error) {
      console.error('Failed to initialize CCTP:', error);
      throw error;
    }
  }

  /**
   * Get CCTP quote for USDC transfer
   * @param {Object} params - Transfer parameters
   * @returns {Object} Quote details
   */
  async getQuote(params) {
    await this.initialize();

    const {
      fromChain,
      toChain,
      amount
    } = params;

    try {
      // Validate chains support CCTP
      if (!CCTP_DOMAINS[fromChain] === undefined || CCTP_DOMAINS[toChain] === undefined) {
        throw new Error('Chain not supported by CCTP');
      }

      // Estimate gas costs
      const provider = this.providers[fromChain];
      const gasPrice = await provider.getGasPrice();
      
      // CCTP burn transaction typically uses ~120k gas
      const estimatedGas = 120000;
      const gasCost = gasPrice.mul(estimatedGas);

      return {
        supported: true,
        protocol: 'Circle CCTP',
        estimatedTime: '13-15 minutes',
        fees: {
          gas: ethers.utils.formatEther(gasCost),
          protocol: '0', // CCTP has no protocol fees!
          total: ethers.utils.formatEther(gasCost)
        },
        steps: [
          'Approve USDC spending',
          'Burn USDC on source chain',
          'Wait for Circle attestation (~13 mins)',
          'Mint USDC on destination chain'
        ]
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
   * Initiate USDC burn on source chain
   * @param {Object} params - Burn parameters
   * @returns {Object} Transaction details
   */
  async burnUSDC(params) {
    await this.initialize();

    const {
      signer,
      fromChain,
      toChain,
      amount,
      recipientAddress
    } = params;

    try {
      const contracts = CCTP_CONTRACTS[fromChain];
      if (!contracts) throw new Error('Chain not supported');

      // Connect contracts
      const usdc = new ethers.Contract(contracts.usdc, USDC_ABI, signer);
      const tokenMessenger = new ethers.Contract(
        contracts.tokenMessenger, 
        TOKEN_MESSENGER_ABI, 
        signer
      );

      // Convert recipient address to bytes32 format
      const mintRecipient = this.addressToBytes32(recipientAddress);
      const destinationDomain = CCTP_DOMAINS[toChain];

      // Check current allowance
      const currentAllowance = await usdc.allowance(
        await signer.getAddress(),
        contracts.tokenMessenger
      );

      // Approve if needed
      if (currentAllowance.lt(amount)) {
        console.log('🔓 Approving USDC...');
        const approveTx = await usdc.approve(contracts.tokenMessenger, amount);
        await approveTx.wait();
        console.log('✅ Approval complete');
      }

      // Burn USDC
      console.log('🔥 Burning USDC on source chain...');
      const burnTx = await tokenMessenger.depositForBurn(
        amount,
        destinationDomain,
        mintRecipient,
        contracts.usdc
      );

      const receipt = await burnTx.wait();
      console.log('✅ Burn complete:', receipt.transactionHash);

      // Extract message from logs
      const burnEvent = receipt.logs.find(
        log => log.topics[0] === ethers.utils.id('DepositForBurn(uint64,address,uint256,address,bytes32,uint32,bytes32)')
      );

      return {
        success: true,
        txHash: receipt.transactionHash,
        nonce: burnEvent ? parseInt(burnEvent.topics[1]) : null,
        message: 'USDC burned. Waiting for attestation...'
      };

    } catch (error) {
      console.error('Burn error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get attestation from Circle's attestation service
   * @param {string} txHash - Burn transaction hash
   * @returns {Object} Attestation data
   */
  async getAttestation(txHash) {
    // Circle provides a public attestation API (no key required!)
    const attestationUrl = `https://iris-api.circle.com/attestations/${txHash}`;
    
    try {
      const response = await fetch(attestationUrl);
      const data = await response.json();
      
      if (data.attestation) {
        return {
          found: true,
          attestation: data.attestation
        };
      }

      return {
        found: false,
        message: 'Attestation not ready yet'
      };

    } catch (error) {
      return {
        found: false,
        error: error.message
      };
    }
  }

  /**
   * Convert address to bytes32 format for CCTP
   * @param {string} address - Address to convert
   * @returns {string} Bytes32 formatted address
   */
  addressToBytes32(address) {
    // Remove 0x prefix if present
    const cleanAddress = address.replace('0x', '');
    
    // Pad to 32 bytes (64 hex characters)
    return '0x' + cleanAddress.padStart(64, '0');
  }

  /**
   * Monitor burn transaction and get attestation
   * @param {string} txHash - Burn transaction hash
   * @param {number} maxAttempts - Maximum polling attempts
   * @returns {Object} Status and attestation
   */
  async waitForAttestation(txHash, maxAttempts = 30) {
    console.log('⏳ Waiting for Circle attestation...');
    
    for (let i = 0; i < maxAttempts; i++) {
      const result = await this.getAttestation(txHash);
      
      if (result.found) {
        console.log('✅ Attestation received!');
        return result;
      }
      
      // Wait 30 seconds between attempts
      console.log(`Attempt ${i + 1}/${maxAttempts}...`);
      await new Promise(resolve => setTimeout(resolve, 30000));
    }
    
    throw new Error('Attestation timeout');
  }
}

module.exports = CCTPService;