#!/bin/bash

echo "🔍 MARKET DETAIL PAGES DIAGNOSIS"
echo "================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Step 1: Check Backend API Health${NC}"

# Test backend health
echo "Testing backend health..."
BACKEND_HEALTH=$(curl -s http://localhost:5001/health 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "✅ Backend is running"
    echo "Response: $BACKEND_HEALTH"
else
    echo "❌ Backend is not responding"
    echo "Please start backend: cd src/backend && npm run dev"
    exit 1
fi

echo -e "\n${BLUE}Step 2: Check Markets API${NC}"

# Test markets endpoint
echo "Testing markets API..."
MARKETS_RESPONSE=$(curl -s "http://localhost:5001/api/markets" 2>/dev/null)
if [ $? -eq 0 ]; then
    MARKET_COUNT=$(echo "$MARKETS_RESPONSE" | jq length 2>/dev/null)
    if [ -n "$MARKET_COUNT" ] && [ "$MARKET_COUNT" != "null" ]; then
        echo "✅ Markets API working - Found $MARKET_COUNT markets"
        
        # Get first market ID for testing
        FIRST_MARKET_ID=$(echo "$MARKETS_RESPONSE" | jq -r '.[0].market_address // .[0].publicKey // .[0].id' 2>/dev/null)
        if [ -n "$FIRST_MARKET_ID" ] && [ "$FIRST_MARKET_ID" != "null" ]; then
            echo "📝 First market ID: $FIRST_MARKET_ID"
            
            # Test individual market endpoint
            echo "Testing individual market API..."
            MARKET_DETAIL=$(curl -s "http://localhost:5001/api/markets/$FIRST_MARKET_ID" 2>/dev/null)
            if [ $? -eq 0 ]; then
                MARKET_QUESTION=$(echo "$MARKET_DETAIL" | jq -r '.question // .data.question // "No question found"' 2>/dev/null)
                echo "✅ Individual market API working"
                echo "📋 Market question: $MARKET_QUESTION"
                
                # Save market data for inspection
                echo "$MARKET_DETAIL" > /tmp/market_detail_response.json
                echo "💾 Full response saved to: /tmp/market_detail_response.json"
            else
                echo "❌ Individual market API failed"
            fi
        else
            echo "⚠️  No valid market ID found in response"
        fi
    else
        echo "❌ Markets API returned invalid JSON"
        echo "Response: $MARKETS_RESPONSE"
    fi
else
    echo "❌ Markets API failed"
fi

echo -e "\n${BLUE}Step 3: Check Frontend Routes${NC}"

# Check if frontend is running
echo "Testing frontend..."
FRONTEND_HEALTH=$(curl -s http://localhost:3000 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "✅ Frontend is running"
else
    echo "❌ Frontend is not running"
    echo "Please start frontend: cd src/frontend && npm run dev"
fi

echo -e "\n${BLUE}Step 4: Test Market Detail Page URL${NC}"

if [ -n "$FIRST_MARKET_ID" ] && [ "$FIRST_MARKET_ID" != "null" ]; then
    MARKET_DETAIL_URL="http://localhost:3000/markets/$FIRST_MARKET_ID"
    echo "Testing market detail page URL: $MARKET_DETAIL_URL"
    
    # Test if URL returns content
    MARKET_PAGE_RESPONSE=$(curl -s "$MARKET_DETAIL_URL" 2>/dev/null)
    if [ $? -eq 0 ]; then
        if echo "$MARKET_PAGE_RESPONSE" | grep -q "Market.*Detail\|Loading\|Error"; then
            echo "✅ Market detail page loads (contains expected content)"
        else
            echo "⚠️  Market detail page loads but content unclear"
        fi
    else
        echo "❌ Market detail page failed to load"
    fi
else
    echo "⚠️  No market ID available for testing detail page"
fi

echo -e "\n${BLUE}Step 5: Check Browser Console Errors${NC}"

echo "🔍 To debug further, please:"
echo "1. Open browser developer tools (F12)"
echo "2. Go to Console tab"
echo "3. Navigate to: $MARKET_DETAIL_URL"
echo "4. Look for any errors or warnings"
echo ""
echo "Common issues to look for:"
echo "- 'MarketDetailPage: Route params debug' messages"
echo "- API fetch errors"
echo "- Invalid public key errors"
echo "- Component rendering errors"

echo -e "\n${BLUE}Step 6: Check Configuration${NC}"

# Check config files
echo "Checking configuration files..."

SOLANA_CONFIG="src/frontend/src/config/solana.js"
if [ -f "$SOLANA_CONFIG" ]; then
    PROGRAM_ID=$(grep -o 'programId: "[^"]*"' "$SOLANA_CONFIG" | cut -d'"' -f2)
    TOKEN_MINT=$(grep -o 'tokenMint: "[^"]*"' "$SOLANA_CONFIG" | cut -d'"' -f2)
    TOKEN_DECIMALS=$(grep -o 'tokenDecimals: [0-9]*' "$SOLANA_CONFIG" | cut -d' ' -f2)
    
    echo "✅ Solana configuration found:"
    echo "  - Program ID: $PROGRAM_ID"
    echo "  - Token Mint: $TOKEN_MINT" 
    echo "  - Token Decimals: $TOKEN_DECIMALS"
else
    echo "❌ Solana configuration file not found: $SOLANA_CONFIG"
fi

ENV_FILE="src/frontend/.env"
if [ -f "$ENV_FILE" ]; then
    API_URL=$(grep "VITE_API_URL" "$ENV_FILE" | cut -d'=' -f2)
    echo "✅ Environment configuration found:"
    echo "  - API URL: $API_URL"
else
    echo "⚠️  Environment file not found (using defaults)"
fi

echo -e "\n${BLUE}Step 7: Suggested Fixes${NC}"

echo "💡 Try these fixes in order:"
echo ""
echo "1. 🔄 HARD REFRESH browser (Cmd+Shift+R or Ctrl+Shift+R)"
echo "2. 🧹 Clear browser cache and storage:"
echo "   - Open DevTools > Application > Storage > Clear storage"
echo "3. 🔄 Restart both servers:"
echo "   - Kill all: pkill -f 'vite'; pkill -f 'nodemon'"
echo "   - Restart backend: cd src/backend && npm run dev"
echo "   - Restart frontend: cd src/frontend && npm run dev"
echo "4. 🗃️  Clear all caches:"
echo "   - rm -rf src/frontend/node_modules/.cache"
echo "   - rm -rf src/backend/node_modules/.cache"

if [ -n "$FIRST_MARKET_ID" ] && [ "$FIRST_MARKET_ID" != "null" ]; then
    echo ""
    echo -e "${GREEN}🎯 Test this specific URL:${NC}"
    echo "   $MARKET_DETAIL_URL"
    echo ""
    echo -e "${YELLOW}📋 Market Details to Test:${NC}"
    echo "   Market ID: $FIRST_MARKET_ID"
    echo "   Question: $MARKET_QUESTION"
fi

echo -e "\n${GREEN}🔍 Diagnosis completed!${NC}"
echo "Check the output above for any issues and follow the suggested fixes." 