#!/bin/bash

# PRIMAPE Markets - Deployment Health Check Script
# Verifies that all services are running correctly after deployment

echo "🏥 PRIMAPE Markets - Deployment Health Check"
echo "============================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check URL health
check_url() {
    local url=$1
    local service_name=$2
    local expected_status=${3:-200}
    
    echo -n "🔍 Checking $service_name... "
    
    # Make HTTP request and get status code
    status_code=$(curl -s -o /dev/null -w "%{http_code}" "$url" --max-time 10)
    
    if [ "$status_code" -eq "$expected_status" ]; then
        echo -e "${GREEN}✅ OK (HTTP $status_code)${NC}"
        return 0
    else
        echo -e "${RED}❌ FAIL (HTTP $status_code)${NC}"
        return 1
    fi
}

# Function to check JSON API response
check_api() {
    local url=$1
    local service_name=$2
    
    echo -n "🔍 Checking $service_name API... "
    
    response=$(curl -s "$url" --max-time 10)
    status_code=$(curl -s -o /dev/null -w "%{http_code}" "$url" --max-time 10)
    
    if [ "$status_code" -eq 200 ]; then
        # Check if response contains expected data
        if echo "$response" | grep -q "markets\|health\|ok"; then
            echo -e "${GREEN}✅ OK (JSON Response)${NC}"
            return 0
        else
            echo -e "${YELLOW}⚠️  WARNING (Empty Response)${NC}"
            return 1
        fi
    else
        echo -e "${RED}❌ FAIL (HTTP $status_code)${NC}"
        return 1
    fi
}

# Get URLs from user input
echo "Please provide your deployment URLs:"
read -p "Frontend URL: " FRONTEND_URL
read -p "Backend URL: " BACKEND_URL

# Remove trailing slashes
FRONTEND_URL=${FRONTEND_URL%/}
BACKEND_URL=${BACKEND_URL%/}

echo ""
echo "🧪 Running Health Checks..."
echo "=============================="

# Track results
failed_checks=0
total_checks=0

# Frontend Health Check
echo ""
echo "🎨 Frontend Service:"
total_checks=$((total_checks + 1))
check_url "$FRONTEND_URL" "Frontend" || failed_checks=$((failed_checks + 1))

# Backend Health Check
echo ""
echo "🔧 Backend Service:"
total_checks=$((total_checks + 1))
check_url "$BACKEND_URL/health" "Backend Health" || failed_checks=$((failed_checks + 1))

# API Endpoints Check
echo ""
echo "📡 API Endpoints:"
total_checks=$((total_checks + 1))
check_api "$BACKEND_URL/api/markets" "Markets API" || failed_checks=$((failed_checks + 1))

# Solana Configuration Check
echo ""
echo "⛓️  Blockchain Configuration:"
echo -n "🔍 Checking Solana network config... "

# Check if frontend loads with correct network
if curl -s "$FRONTEND_URL" | grep -q "mainnet\|9BZJXtmfPpkHnM57gHEx5Pc9oQhLhJtr4mhCsNtttTts"; then
    echo -e "${GREEN}✅ Mainnet config detected${NC}"
else
    echo -e "${YELLOW}⚠️  Could not verify mainnet config${NC}"
    failed_checks=$((failed_checks + 1))
fi
total_checks=$((total_checks + 1))

# Database Connection Check (via API)
echo ""
echo "🗄️  Database:"
echo -n "🔍 Checking database connection... "
if check_api "$BACKEND_URL/api/markets" "Database" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Database connected${NC}"
else
    echo -e "${RED}❌ Database connection issues${NC}"
    failed_checks=$((failed_checks + 1))
fi
total_checks=$((total_checks + 1))

# Security Headers Check
echo ""
echo "🔒 Security:"
echo -n "🔍 Checking HTTPS... "
if [[ "$FRONTEND_URL" == https://* ]] && [[ "$BACKEND_URL" == https://* ]]; then
    echo -e "${GREEN}✅ HTTPS enabled${NC}"
else
    echo -e "${YELLOW}⚠️  HTTP detected (consider HTTPS)${NC}"
fi

# Final Summary
echo ""
echo "📊 HEALTH CHECK SUMMARY"
echo "======================="
passed_checks=$((total_checks - failed_checks))

if [ $failed_checks -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL CHECKS PASSED! ($passed_checks/$total_checks)${NC}"
    echo ""
    echo "✅ Your PRIMAPE Markets deployment is healthy!"
    echo ""
    echo "🔗 Quick Links:"
    echo "   Frontend: $FRONTEND_URL"
    echo "   Backend:  $BACKEND_URL/health"
    echo "   API:      $BACKEND_URL/api/markets"
else
    echo -e "${RED}❌ $failed_checks CHECKS FAILED ($passed_checks/$total_checks passed)${NC}"
    echo ""
    echo "🔧 Troubleshooting:"
    echo "   1. Check service logs in Railway/Vercel dashboard"
    echo "   2. Verify environment variables are set correctly"
    echo "   3. Ensure database is connected and migrated"
    echo "   4. Check CORS configuration"
    echo ""
fi

# Performance Check
echo ""
echo "⚡ Performance Test:"
echo -n "🔍 Measuring frontend load time... "
start_time=$(date +%s%N)
curl -s -o /dev/null "$FRONTEND_URL"
end_time=$(date +%s%N)
load_time=$(( (end_time - start_time) / 1000000 ))

if [ $load_time -lt 1000 ]; then
    echo -e "${GREEN}✅ Fast (${load_time}ms)${NC}"
elif [ $load_time -lt 3000 ]; then
    echo -e "${YELLOW}⚠️  Moderate (${load_time}ms)${NC}"
else
    echo -e "${RED}❌ Slow (${load_time}ms)${NC}"
fi

echo ""
echo "🚀 Deployment check complete!" 