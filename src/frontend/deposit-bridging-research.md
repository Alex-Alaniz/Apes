# Deposit and Bridging Research Summary

## Overview

This document summarizes research on deposit and bridging approaches across various platforms.

## 1. Verso Trading

**Status**: Limited information available
- Landing page exists but lacks technical details
- No specific documentation found about deposit/bridging mechanisms
- May be a newer platform or operating under limited disclosure

## 2. Polym Trade

**Overview**: Mobile trading terminal for Polymarket with AI insights

### Deposit Flow
- Simple onboarding: "Log in" → "Top up balances" → "Sign transactions"
- Supports wallet connection or email-based wallet creation
- Documentation emphasizes ease of use but lacks technical depth

### Technical Details
- Acts as a frontend for Polymarket
- Inherits Polymarket's non-custodial model
- No specific bridging implementation details found

## 3. PMX Trade

**Bridge Provider**: deBridge (Solana → Polygon)

### Key Features
- **Non-custodial**: No burning mechanism, funds remain safe
- **Fees**: Only deBridge fees apply (no additional platform fees)
- **Automatic gas handling**: 2% SOL → POL swap for gas fees
- **Points program**: Users earn deBridge points

### User Experience
- Initiate via `/fund` command
- Provides wallet address and instructions
- Recommends Phantom wallet for Polygon
- Manual token swapping available via `/wallet`

### Technical Notes
- Simple retry mechanism for failed bridges
- Automatic token swap for gas requirements
- Clear non-custodial approach

## 4. Relay.link

**Most comprehensive API-based solution**

### API Workflow
1. **Get Quote** (`/quote` endpoint)
   - Specify user, chains, currencies, amounts
   - Choose trade type (EXACT_INPUT/EXACT_OUTPUT)

2. **Quote Response**
   - Transaction steps
   - Detailed fee breakdown
   - Time estimates
   - Source/destination currency details

### Advanced Features
- App fee integration
- Custom slippage tolerance
- Gas topup options
- Referrer tracking
- Status monitoring (waiting/pending/success/failure/refund)

### Integration Requirements
- Balance verification
- Chain support validation
- Fresh quote requirements
- Error handling
- Progress tracking

## 5. Flipr Bot

**Simple, direct approach**

### Supported Assets
- USDC.e on Polygon (0x2791bca1f2de4661ed88a30c99a7a9449aa84174)
- SOL on Solana (minimum 0.1 SOL)

### Funding Methods
1. **Direct Transfer**
   - Navigate → "Add Funds" → Copy address → Send
   - Move from Spot Balance to Leverage Fund

2. **Bank Transfer**: Coming soon (fiat on-ramps)

### Fee Structure
- **Platform fees**: None
- **Network fees**: Standard blockchain costs only

### Security
- Address verification emphasis
- Small initial deposits recommended
- Private key safety warnings
- Wrong network recovery procedures

## Key Insights

### Common Patterns

1. **Non-custodial preference**: Most platforms (PMX, Relay, Flipr) emphasize user control
2. **Simple UX**: Hide complexity behind clean interfaces
3. **Multi-chain support**: Focus on Polygon, Solana, Ethereum ecosystems
4. **USDC dominance**: Primary trading currency across platforms

### Technical Approaches

1. **API-First (Relay)**: Comprehensive programmatic integration
2. **Bridge Aggregation (PMX)**: Partner with specialized providers
3. **Direct Transfer (Flipr)**: Simple address-based deposits
4. **Hybrid Decentralized (Polymarket/Polym)**: Off-chain matching, on-chain settlement

### Fee Strategies

- **No platform fees**: PMX, Flipr
- **Network fees only**: Common baseline
- **Bridge provider fees**: When using third-party bridges
- **Gas optimization**: Automatic token swaps (PMX)

### User Experience Priorities

1. **Minimal steps**: 3-4 click deposit flows
2. **Clear instructions**: Step-by-step guides
3. **Error recovery**: Wrong network/failed transaction handling
4. **Progressive disclosure**: Hide technical details from casual users

## Recommendations for APES Platform

Based on this research, consider:

1. **Non-custodial approach**: Aligns with Web3 values and reduces regulatory burden
2. **Bridge aggregation**: Partner with established providers (deBridge, Relay)
3. **Simple UX**: Copy successful patterns from Flipr/PMX
4. **USDC focus**: Already aligned with market standard
5. **API flexibility**: Consider Relay-style programmatic access for advanced users
6. **Gas optimization**: Automatic small token swaps for new users
7. **Clear documentation**: Balance simplicity with technical transparency