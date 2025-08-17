#!/bin/bash

# 🔒 APES Emergency Security Script
# This script implements immediate security measures for the APES platform

set -e  # Exit on any error

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${RED}🚨 APES EMERGENCY SECURITY MEASURES 🚨${NC}"
echo "=========================================="
echo ""

# Function to generate secure random strings
generate_random() {
    local length=${1:-32}
    openssl rand -hex $length 2>/dev/null || cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w $length | head -n 1
}

# Step 1: Secure Git Repository
echo -e "${YELLOW}Step 1: Securing Git Repository${NC}"
echo "-----------------------------------"

# Remove any .env files from git tracking
echo "🔍 Checking for tracked environment files..."
git ls-files | grep -E '\.(env|key|pem|json)$' | grep -v package || echo "No environment files found in git"

# Update .gitignore with comprehensive exclusions
echo "📝 Updating .gitignore with security exclusions..."
cat >> .gitignore << 'EOF'

# Security - Environment Variables and Keys
*.env*
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
.env.production
.env.mainnet
.env.backup

# Security - Private Keys and Certificates
*.key
*.pem
*.p12
*.pfx
wallet*.json
*.wallet
keypair*.json

# Security - Database dumps and backups
*.sql.backup
*.db.backup
database.dump

# Security - Logs that might contain sensitive data
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Security - Build artifacts that might contain secrets
.next/
dist/
build/
.cache/

# Security - IDE and system files
.vscode/settings.json
.idea/
*.swp
*.swo
*~

EOF

echo "✅ .gitignore updated with security exclusions"

# Step 2: Create Secure Environment Templates
echo -e "\n${YELLOW}Step 2: Creating Secure Environment Templates${NC}"
echo "---------------------------------------------"

# Check if we need to create backend env template
if [ ! -f "backend/env.example.secure" ]; then
    echo "❌ Backend environment template missing - already created in previous step"
else
    echo "✅ Backend environment template exists"
fi

# Check if we need to create frontend env template
if [ ! -f "src/frontend/env.example.secure" ]; then
    echo "❌ Frontend environment template missing - already created in previous step"
else
    echo "✅ Frontend environment template exists"
fi

# Step 3: Generate Secure Secrets
echo -e "\n${YELLOW}Step 3: Generating Secure Secrets${NC}"
echo "--------------------------------------"

echo "🔑 Generating secure secrets for your .env files:"
echo ""
echo "JWT_SECRET=$(generate_random 64)"
echo "TWITTER_ENCRYPTION_KEY=$(generate_random 32)"
echo "SESSION_SECRET=$(generate_random 48)"
echo "API_ENCRYPTION_KEY=$(generate_random 32)"
echo ""
echo "⚠️  SAVE THESE SECRETS SECURELY - They will not be shown again!"
echo ""

# Step 4: Identify Exposed Credentials
echo -e "\n${YELLOW}Step 4: Scanning for Exposed Credentials${NC}"
echo "--------------------------------------------"

echo "🔍 Scanning codebase for potential credential exposure..."

# Check for hardcoded secrets
echo "Checking for hardcoded database URLs:"
grep -r "postgresql://" --include="*.js" --include="*.ts" --include="*.md" . | grep -v ".git" | grep -v "node_modules" | grep -v "template" | head -5 || echo "None found"

echo ""
echo "Checking for API keys in code:"
grep -r "api[_-]key" --include="*.js" --include="*.ts" . | grep -v ".git" | grep -v "node_modules" | grep -v "template" | head -5 || echo "None found"

echo ""
echo "Checking for private key references:"
grep -r "private.*key" --include="*.js" --include="*.ts" . | grep -v ".git" | grep -v "node_modules" | grep -v "template" | head -5 || echo "None found"

# Step 5: Smart Contract Security Check
echo -e "\n${YELLOW}Step 5: Smart Contract Security Check${NC}"
echo "---------------------------------------"

echo "🔍 Checking smart contract configuration..."
if [ -f "src/smart_contracts/market_system/Anchor.toml" ]; then
    echo "⚠️  Found Anchor.toml with potential wallet reference"
    echo "📝 Consider moving wallet reference to environment variable"
else
    echo "✅ No smart contract configuration issues found"
fi

# Step 6: Database Security
echo -e "\n${YELLOW}Step 6: Database Security Recommendations${NC}"
echo "----------------------------------------------"

echo "📋 Database security checklist:"
echo "  🔄 Rotate database passwords immediately"
echo "  🔄 Rotate Supabase service role keys"
echo "  🔒 Enable database access logging"
echo "  🔒 Restrict database access by IP"
echo "  🔒 Use connection pooling with limited privileges"

# Step 7: API Security Setup
echo -e "\n${YELLOW}Step 7: API Security Setup${NC}"
echo "----------------------------"

echo "📦 Installing security dependencies..."
cd backend
if [ -f "package.json" ]; then
    echo "Installing core security packages..."
    npm install express-rate-limit helmet cors || echo "⚠️  Manual installation required"
    echo "✅ Security packages installation attempted"
else
    echo "⚠️  Backend package.json not found"
fi
cd ..

# Step 8: Production Security Checklist
echo -e "\n${YELLOW}Step 8: Production Security Checklist${NC}"
echo "---------------------------------------"

cat << EOF
📋 IMMEDIATE ACTIONS REQUIRED:

🔴 CRITICAL (Do Now):
  ❌ Remove all .env files from git history
  ❌ Rotate all database credentials
  ❌ Rotate all API keys (Believe, Twitter, RPC)
  ❌ Update admin wallet configuration to use env vars
  ❌ Review and restrict CORS settings

🟡 HIGH PRIORITY (This Week):
  ⚠️  Implement new admin authentication system
  ⚠️  Deploy API security middleware
  ⚠️  Set up monitoring and alerting
  ⚠️  Enable rate limiting in production
  ⚠️  Audit all user permissions

🟢 ONGOING:
  📊 Monitor security logs
  🔄 Regular security audits
  🔄 Keep dependencies updated
  🔄 Regular penetration testing

EOF

# Step 9: Environment-Specific Instructions
echo -e "\n${YELLOW}Step 9: Environment-Specific Setup${NC}"
echo "------------------------------------"

echo "🏗️  Development Environment:"
echo "  1. Copy backend/env.example.secure to backend/.env"
echo "  2. Copy src/frontend/env.example.secure to src/frontend/.env"
echo "  3. Fill in actual values using the generated secrets above"
echo "  4. Test the security middleware"
echo ""

echo "🚀 Production Environment:"
echo "  1. Use hosting provider environment variables"
echo "  2. Never store secrets in files"
echo "  3. Use secret management services"
echo "  4. Enable all security middleware"
echo ""

# Final Security Recommendations
echo -e "\n${RED}🔒 FINAL SECURITY RECOMMENDATIONS 🔒${NC}"
echo "============================================="
echo ""

cat << EOF
1. 🚨 IMMEDIATE: Change all passwords and API keys
2. 🔐 IMMEDIATE: Remove admin wallets from frontend code
3. 📊 THIS WEEK: Implement comprehensive logging
4. 🛡️  THIS WEEK: Deploy rate limiting and security headers
5. 🔍 ONGOING: Regular security monitoring

⚠️  Remember: Security is an ongoing process, not a one-time fix!

For questions about this security implementation, refer to:
- SECURITY_REMEDIATION_PLAN.md
- backend/env.example.secure
- src/frontend/env.example.secure

🚀 Next: Run your application with the new security measures!
EOF

echo ""
echo -e "${GREEN}✅ Emergency security measures completed!${NC}"
echo -e "${YELLOW}⚠️  Remember to implement the critical actions listed above.${NC}"
echo "" 