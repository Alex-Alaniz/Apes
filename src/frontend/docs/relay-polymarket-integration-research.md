# Relay.link and Polymarket Integration Research

## Relay.link Bridging API

### Overview
Relay.link provides a high-performance, low-friction layer for cross-chain bridging across 72+ blockchains with 1-10 second transaction times.

### API Endpoints

#### 1. Quote Endpoint
- **URL**: `POST /quote`
- **Purpose**: Generate bridge quotes with transaction steps and fees

**Request Parameters:**
```json
{
  "user": "0x742d35Cc6634C0532925a3b8D9d4DB0a2D7DD5B3",
  "originChainId": 1,
  "destinationChainId": 8453,
  "originCurrency": "0x0000000000000000000000000000000000000000",
  "destinationCurrency": "0x0000000000000000000000000000000000000000",
  "amount": "100000000000000000",
  "tradeType": "EXACT_INPUT"
}
```

**Key Parameters:**
- `user`: Wallet address initiating bridge
- `originChainId`: Source blockchain ID
- `destinationChainId`: Target blockchain ID
- `originCurrency`: Source token contract address
- `destinationCurrency`: Destination token contract address
- `amount`: Transfer amount in smallest unit
- `tradeType`: "EXACT_INPUT" or "EXACT_OUTPUT"

#### 2. Status Endpoint
- **URL**: `/intents/status`
- **Purpose**: Track bridge transaction status
- **Status Values**: `waiting`, `pending`, `success`, `failure`, `refund`

### Advanced Features

1. **App Fees**: Add custom fees to bridge transactions
2. **Custom Slippage**: Control transaction tolerance
3. **Gas Topup**: Optional destination chain gas funding

### NPM SDK

**Package**: `@reservoir0x/relay-sdk`

**Installation**:
```bash
npm install @reservoir0x/relay-sdk axios viem dotenv
```

### Implementation Example

```javascript
const axios = require("axios");
require("dotenv").config();

// Initialize API client
const relayApi = axios.create({
  baseURL: process.env.RELAY_API_KEY.includes("testnet")
    ? "https://api-testnet.relay.link"
    : "https://api.relay.link",
  headers: {
    Authorization: `Bearer ${process.env.RELAY_API_KEY}`,
    "Content-Type": "application/json",
    "x-relay-source": "apes-platform",
  },
});

// Get bridge quote
async function getQuote(params) {
  try {
    const response = await relayApi.post("/quote", params);
    if (!response.data.steps) throw new Error("No swap route available");
    return response.data;
  } catch (error) {
    throw new Error(`Get Quote Error: ${error.response?.data?.message || error.message}`);
  }
}

// Execute bridge steps
async function executeSteps(quote, walletClient, retries = 2) {
  for (const step of quote.steps) {
    if (step.kind === "transaction") {
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          const txHash = await walletClient.sendTransaction({
            to: step.to,
            data: step.data,
            value: BigInt(step.value || 0),
          });
          const receipt = await walletClient.waitForTransactionReceipt({ hash: txHash });
          if (receipt.status === "reverted") throw new Error(`Transaction ${txHash} reverted`);
          break;
        } catch (error) {
          if (attempt === retries) throw error;
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
  }
}
```

### Integration Flow

1. **Get Quote**: Request bridge details with origin/destination chains, currency, and amount
2. **Execute Bridge**: Process each step in the quote response
3. **Monitor Status**: Track transaction progress using status endpoint

### Preflight Checklist

- ✓ Verify user balance
- ✓ Confirm chain support
- ✓ Validate fresh quotes
- ✓ Implement error handling
- ✓ Monitor transaction progress

## Polymarket Deposit Documentation

### Supported Chains and Tokens

#### Supported Chains:
- Ethereum
- Polygon
- Base
- Arbitrum
- Solana

#### Supported Tokens by Chain:

**Ethereum:**
- USDC, USDT, DAI, ETH, WETH, MATIC, POL, CBBTC

**Polygon:**
- USDC, USDC.e, USDT, DAI, MATIC, POL

**Base:**
- USDC, USDT, DAI, ETH, WETH, CBBTC

**Arbitrum:**
- USDC, USDT, DAI, ETH, WETH, ARB

**Solana:**
- USDC, SOL

### Large Deposit Recommendations

For deposits **over $50,000**, Polymarket recommends using cross-chain bridges:

1. **DeBridge**
2. **Across**
3. **Portal**

### Important Considerations

1. **Token Conversion**: 
   - Deposits must be USDC or USDC.e to Polygon wallet
   - Native USDC requires "activate funds" which swaps to USDC.e
   - Swap uses lowest fee Uniswap pool with <10 bps slippage

2. **Warnings**:
   - Polymarket is not affiliated with third-party bridges
   - Always review bridge Terms of Use
   - Verify deposit address before transferring
   - Be mindful of potential slippage

3. **Support**:
   - Discord for deposit issues
   - Email: support@polymarket.com
   - Live chat on website

### Security Notes

- Only send supported token-chain combinations
- Sending non-supported tokens may cause irrecoverable loss
- Always double-check deposit addresses

## Integration Architecture for APES Platform

### Proposed Flow

1. **User initiates bridge from APES platform**
   - Select source chain (Solana, Ethereum, etc.)
   - Choose USDC amount to bridge
   - Platform generates Relay.link quote

2. **Execute bridge to Polygon**
   - Use Relay.link API to bridge USDC to Polygon
   - Monitor transaction status
   - Confirm arrival on Polygon

3. **Deposit to Polymarket**
   - Convert to USDC.e if needed
   - Transfer to Polymarket deposit address
   - Track deposit confirmation

### Implementation Considerations

1. **Fee Structure**:
   - Relay.link bridge fees
   - Gas fees on source/destination chains
   - Potential APES platform fee
   - Polymarket deposit fees (if any)

2. **Error Handling**:
   - Failed bridge transactions
   - Insufficient balance
   - Network congestion
   - Invalid quotes

3. **User Experience**:
   - Real-time status updates
   - Clear fee breakdown
   - Estimated completion time
   - Transaction history

### Next Steps

1. Obtain Relay.link API key from relay.link
2. Set up test environment with testnet API
3. Implement quote generation and display
4. Add transaction execution with proper error handling
5. Create status tracking UI
6. Test with small amounts on mainnet
7. Add support for multiple source chains
8. Implement fee optimization logic