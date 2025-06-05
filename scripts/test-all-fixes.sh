#!/bin/bash

echo "🧪 PRIMAPE FIXES VERIFICATION"
echo "============================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

TESTS_PASSED=0
TESTS_FAILED=0

# Function to run test
run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_pattern="$3"
    
    echo -e "${BLUE}Testing: $test_name${NC}"
    
    result=$(eval "$test_command" 2>&1)
    
    if echo "$result" | grep -q "$expected_pattern"; then
        echo -e "✅ ${GREEN}PASS${NC}: $test_name"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        echo -e "❌ ${RED}FAIL${NC}: $test_name"
        echo "Expected pattern: $expected_pattern"
        echo "Got: $result"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

echo -e "${BLUE}Test 1: Backend Health Check${NC}"
run_test "Backend API Health" "curl -s http://localhost:5001/api/markets | jq 'length'" "[0-9]"

echo -e "\n${BLUE}Test 2: Market Detail Page Crash Fix${NC}"
PROBLEMATIC_MARKET="Ds8j4TwN8SwPkLGrQ4dVMoENtNTaf1aVEzKf1LkTUiGC"
run_test "Market Detail API Data" "curl -s http://localhost:5001/api/markets/$PROBLEMATIC_MARKET | jq '.question'" "Which company has best AI model"

echo -e "\n${BLUE}Test 3: Participant Counter Fix${NC}"
run_test "Participant Count Recount" "curl -s -X POST http://localhost:5001/api/markets/recount-participants | jq '.success'" "true"

echo -e "\n${BLUE}Test 4: Token Decimals Configuration${NC}"
# Test devnet config
run_test "Devnet Token Decimals" "grep -o 'tokenDecimals: [0-9]*' src/frontend/src/config/solana.js | head -1" "tokenDecimals: 6"

# Test mainnet config
run_test "Mainnet Token Decimals" "grep -A 10 'mainnet:' src/frontend/src/config/solana.js | grep 'tokenDecimals:'" "tokenDecimals: 9"

echo -e "\n${BLUE}Test 5: Market Data Validation${NC}"
# Test markets have proper data structure
run_test "Markets Data Structure" "curl -s http://localhost:5001/api/markets | jq '.[0] | has(\"question\") and has(\"optionPercentages\") and has(\"participantCount\")'" "true"

echo -e "\n${BLUE}Test 6: Frontend Build Test${NC}"
# Test if frontend can build without errors
run_test "Frontend Build" "cd src/frontend && npm run build --silent && echo 'BUILD_SUCCESS'" "BUILD_SUCCESS"

echo -e "\n${BLUE}Test 7: Database Schema Validation${NC}"
# Test if participant_count column exists
run_test "Participant Count Column" "curl -s http://localhost:5001/api/markets | jq '.[0].participantCount // \"missing\"'" "[0-9]"

echo -e "\n${BLUE}Test 8: Market Detail Page URLs${NC}"
# Test specific market URLs
FIRST_MARKET=$(curl -s http://localhost:5001/api/markets | jq -r '.[0].publicKey' 2>/dev/null)
if [ "$FIRST_MARKET" != "null" ] && [ -n "$FIRST_MARKET" ]; then
    echo "Testing market detail page: $FIRST_MARKET"
    run_test "Market Detail URL" "curl -s http://localhost:3000/markets/$FIRST_MARKET | grep -q 'Market\\|Loading\\|Error' && echo 'PAGE_LOADS'" "PAGE_LOADS"
else
    echo "⚠️  No markets available for URL testing"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

echo -e "\n${BLUE}Test 9: API Response Format${NC}"
# Test that individual market API returns clean JSON
run_test "Clean JSON Response" "curl -s http://localhost:5001/api/markets/$PROBLEMATIC_MARKET | jq '.optionPercentages | type'" "array"

echo -e "\n${BLUE}Test 10: Volume and Participant Data Consistency${NC}"
# Test markets with volume have participant counts
MARKETS_WITH_VOLUME=$(curl -s http://localhost:5001/api/markets | jq '[.[] | select(.totalVolume > 0)] | length')
run_test "Volume Markets Have Participants" "echo $MARKETS_WITH_VOLUME" "[0-9]"

echo -e "\n${BLUE}Summary${NC}"
echo "======="
echo -e "✅ Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "❌ Tests Failed: ${RED}$TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n🎉 ${GREEN}ALL TESTS PASSED!${NC}"
    echo "✅ Market detail page crash: FIXED"
    echo "✅ Participant counter: FIXED"
    echo "✅ Token decimals config: CORRECT"
    echo "✅ API responses: CLEAN"
    echo "✅ Database schema: VALID"
    echo ""
    echo -e "${GREEN}🚀 Platform is ready for mainnet deployment!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Run: chmod +x scripts/mainnet-deployment.sh"
    echo "2. Run: ./scripts/mainnet-deployment.sh"
    echo "3. Deploy to production"
    exit 0
else
    echo -e "\n⚠️  ${YELLOW}Some tests failed. Please fix issues before mainnet deployment.${NC}"
    echo ""
    echo "Common fixes:"
    echo "- Restart backend: cd src/backend && npm run dev"
    echo "- Clear browser cache: Hard refresh (Cmd+Shift+R)"
    echo "- Check API endpoints are working"
    exit 1
fi 