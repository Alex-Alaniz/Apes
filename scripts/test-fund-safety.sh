#!/bin/bash

# Test Fund Safety Script
# This script tests all scenarios where funds could potentially be locked

echo "💰 Testing Fund Safety..."
echo "========================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Test scenarios
echo -e "${YELLOW}Running fund safety tests...${NC}"

# Test 1: Users can claim winnings from resolved markets
echo -e "\n${YELLOW}Test 1: Claiming winnings from resolved markets${NC}"
node test-claim-scenarios.js

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Claim test failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Users can claim winnings successfully${NC}"

# Test 2: Users can withdraw from cancelled markets
echo -e "\n${YELLOW}Test 2: Emergency withdrawal from cancelled markets${NC}"
node test-emergency-withdrawal.js

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Emergency withdrawal test failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Users can withdraw from cancelled markets${NC}"

# Test 3: Escrow balance tracking
echo -e "\n${YELLOW}Test 3: Escrow balance integrity${NC}"
node test-escrow-balance.js

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Escrow balance test failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Escrow balances are tracked correctly${NC}"

# Test 4: Fee calculations
echo -e "\n${YELLOW}Test 4: Fee calculation safety${NC}"
node test-fee-calculations.js

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Fee calculation test failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Fees are calculated safely${NC}"

# Test 5: Pool overflow protection
echo -e "\n${YELLOW}Test 5: Pool overflow protection${NC}"
node test-pool-overflow.js

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Pool overflow test failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Pool overflow protection working${NC}"

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}✅ ALL FUND SAFETY TESTS PASSED!${NC}"
echo -e "${GREEN}========================================${NC}"

echo -e "\nFund Safety Summary:"
echo -e "✅ Users can always claim winnings"
echo -e "✅ Users can withdraw from cancelled markets"
echo -e "✅ Escrow balances are accurate"
echo -e "✅ Fees cannot exceed limits"
echo -e "✅ Pools cannot overflow"

echo -e "\n${YELLOW}Ready for mainnet deployment!${NC}" 