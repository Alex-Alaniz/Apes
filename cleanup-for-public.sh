#!/bin/bash

# =============================================================================
# APES Repository Cleanup Script for Public Showcase
# Prepares codebase for Associate Director - Lead Blockchain Engineer interview
# =============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════════════════╗"
echo "║         APES Repository Cleanup for Public Showcase                   ║"
echo "║         Lead Blockchain Engineer (Rust) Interview Prep                ║"
echo "╚═══════════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Track what we've done
REMOVED_FILES=0
MOVED_DOCS=0
ERRORS=0

# =============================================================================
# STEP 1: Remove files with exposed credentials
# =============================================================================
echo -e "\n${YELLOW}━━━ STEP 1: Removing files with exposed credentials ━━━${NC}\n"

CREDENTIAL_FILES=(
    "LOCAL_BACKEND_SETUP.md"
    "backend/award-points.js"
    "backend/run-tournament-migration.js"
    "backend/scripts/clean-replies-retweets.js"
    "backend/scripts/remove-fake-tweets.js"
    "backend/test-engagement.js"
)

for file in "${CREDENTIAL_FILES[@]}"; do
    if [ -f "$file" ]; then
        rm "$file"
        echo -e "  ${GREEN}✓${NC} Removed: $file"
        ((REMOVED_FILES++))
    else
        echo -e "  ${YELLOW}⚠${NC} Already removed: $file"
    fi
done

# Also check for any other files that might have the credentials
echo -e "\n  Scanning for any remaining credential references..."
REMAINING=$(grep -rl "uKF5DzUcfwoRlryr\|eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvdmJtYnNubGNteGlubG1saW16" --include="*.js" --include="*.ts" --include="*.md" 2>/dev/null | grep -v "cleanup" || true)

if [ -n "$REMAINING" ]; then
    echo -e "  ${RED}⚠ Found additional files with credentials:${NC}"
    echo "$REMAINING" | while read file; do
        echo -e "    - $file"
    done
    echo -e "  ${YELLOW}These need manual review${NC}"
else
    echo -e "  ${GREEN}✓${NC} No remaining credential references found"
fi

# =============================================================================
# STEP 2: Consolidate documentation files
# =============================================================================
echo -e "\n${YELLOW}━━━ STEP 2: Consolidating documentation files ━━━${NC}\n"

# Create organized docs structure
mkdir -p docs/deployment
mkdir -p docs/security
mkdir -p docs/features
mkdir -p docs/api
mkdir -p docs/archive

# Move deployment docs
DEPLOYMENT_DOCS=(
    "DEPLOYMENT_GUIDE.md" "DEPLOYMENT_OPTIONS.md" "DEPLOYMENT_ORDER.md"
    "DEPLOYMENT_RESUME.md" "DEPLOYMENT_SUCCESS_SUMMARY.md" "DEPLOYMENT_TRIGGER.md"
    "FRESH_DEPLOYMENT_GUIDE.md" "FRESH_DEPLOYMENT_SUMMARY.md"
    "MAINNET_DEPLOYMENT_CHECKLIST.md" "MAINNET_DEPLOYMENT_FIX.md"
    "MAINNET_DEPLOYMENT_GUIDE.md" "MAINNET_DEPLOYMENT_READY.md"
    "MAINNET_LAUNCH_CHECKLIST.md" "MAINNET_PREPARATION.md"
    "MAINNET_READINESS_REPORT.md" "FINAL_DEPLOYMENT_CHECKLIST.md"
    "RAILWAY_DEPLOYMENT_FIXES.md" "RAILWAY_FINAL_FIX.md"
    "RAILWAY_HEALTH_CHECK_FIX.md" "RAILWAY_HEALTH_FIX.md"
    "RAILWAY_NEXT_STEPS.md" "RAILWAY_PRODUCTION_FIXES.md"
    "RAILWAY_TROUBLESHOOTING_GUIDE.md" "VERCEL_DEPLOYMENT.md"
    "PRIVY_DEPLOYMENT_READY.md" "PRIVY_SAFE_DEPLOYMENT.md"
)

for doc in "${DEPLOYMENT_DOCS[@]}"; do
    if [ -f "$doc" ]; then
        mv "$doc" docs/deployment/ 2>/dev/null && ((MOVED_DOCS++)) || true
    fi
done
echo -e "  ${GREEN}✓${NC} Moved deployment docs to docs/deployment/"

# Move security docs
SECURITY_DOCS=(
    "SECURITY_AUDIT_CHECKLIST.md" "SECURITY_FIXES_IMPLEMENTED.md"
    "SECURITY_IMPLEMENTATION_COMPLETE.md" "SECURITY_PROGRESS_REPORT.md"
    "SECURITY_REMEDIATION_PLAN.md"
)

for doc in "${SECURITY_DOCS[@]}"; do
    if [ -f "$doc" ]; then
        mv "$doc" docs/security/ 2>/dev/null && ((MOVED_DOCS++)) || true
    fi
done
echo -e "  ${GREEN}✓${NC} Moved security docs to docs/security/"

# Move feature docs
FEATURE_DOCS=(
    "ENGAGE_TO_EARN_DESIGN.md" "ENGAGE_TO_EARN_IMPROVEMENTS.md"
    "ENGAGE_TO_EARN_README.md" "ENGAGE_TO_EARN_V2_DESIGN.md"
    "ENGAGE_TO_EARN_V2_SUMMARY.md" "PARLAY_SYSTEM_EXPLANATION.md"
    "POLYMARKET_API_QUICKSTART.md" "POLYMARKET_INTEGRATION_ONEPAGER.md"
    "POLYMARKET_INTEGRATION_SUMMARY.md" "POLYMARKET_SETUP_SUMMARY.md"
    "BELIEVE_API_SETUP.md" "BELIEVE_API_UPDATE.md" "BELIEVE_INTEGRATION.md"
    "TWITTER_AUTH_FIX.md" "TWITTER_MULTI_WALLET_SOLUTION.md"
    "TWITTER_OAUTH_SETUP_GUIDE.md" "TWITTER_SETUP_GUIDE.md"
    "MULTI_OPTION_BETTING_SUMMARY.md" "MULTI_WALLET_IMPLEMENTATION_PLAN.md"
    "MULTI_WALLET_TESTING_GUIDE.md" "LEADERBOARD_FIXES_SUMMARY.md"
    "LIVE_DATA_SYSTEM.md" "TWEET_CACHE_SYSTEM.md"
    "FEE_LABELS_UPDATE.md" "FEE_STRUCTURE_TRANSPARENCY.md"
)

for doc in "${FEATURE_DOCS[@]}"; do
    if [ -f "$doc" ]; then
        mv "$doc" docs/features/ 2>/dev/null && ((MOVED_DOCS++)) || true
    fi
done
echo -e "  ${GREEN}✓${NC} Moved feature docs to docs/features/"

# Move API docs
API_DOCS=(
    "API_CONNECTIVITY_FIXES.md" "BACKEND_CONSOLIDATION_PLAN.md"
    "BACKEND_IMPLEMENTATION_SUMMARY.md" "BACKEND_STRUCTURE_UPDATE.md"
    "DATABASE_ARCHITECTURE.md" "SUPABASE_SETUP_COMPLETE.md"
)

for doc in "${API_DOCS[@]}"; do
    if [ -f "$doc" ]; then
        mv "$doc" docs/api/ 2>/dev/null && ((MOVED_DOCS++)) || true
    fi
done
echo -e "  ${GREEN}✓${NC} Moved API docs to docs/api/"

# Move remaining .md files to archive (except README, CLAUDE, and key docs)
KEEP_ROOT=(
    "README.md" "CLAUDE.md" "SMART_CONTRACT_EXPLAINED.md"
    "RUNNING_THE_APP.md" "QA_TESTING_CHECKLIST.md"
)

for md_file in *.md; do
    if [ -f "$md_file" ]; then
        KEEP=false
        for keep_file in "${KEEP_ROOT[@]}"; do
            if [ "$md_file" == "$keep_file" ]; then
                KEEP=true
                break
            fi
        done
        if [ "$KEEP" = false ]; then
            mv "$md_file" docs/archive/ 2>/dev/null && ((MOVED_DOCS++)) || true
        fi
    fi
done
echo -e "  ${GREEN}✓${NC} Archived remaining docs to docs/archive/"

# =============================================================================
# STEP 3: Clean up utility scripts
# =============================================================================
echo -e "\n${YELLOW}━━━ STEP 3: Cleaning up utility scripts ━━━${NC}\n"

# Create scripts organization
mkdir -p scripts/deployment
mkdir -p scripts/testing
mkdir -p scripts/utilities

# Move deployment scripts
for script in deploy-*.sh; do
    [ -f "$script" ] && mv "$script" scripts/deployment/ 2>/dev/null || true
done

# Move test scripts
for script in test-*.js test-*.sh; do
    [ -f "$script" ] && mv "$script" scripts/testing/ 2>/dev/null || true
done

# Move utility scripts
UTILITY_SCRIPTS=(
    "check-platform-status.js" "read-blockchain-status.js"
    "fix-*.js" "fix-*.sh" "quick-*.js" "quick-*.sh"
    "*.sh"
)

for pattern in "${UTILITY_SCRIPTS[@]}"; do
    for script in $pattern; do
        if [ -f "$script" ] && [ "$script" != "cleanup-for-public.sh" ]; then
            mv "$script" scripts/utilities/ 2>/dev/null || true
        fi
    done
done

echo -e "  ${GREEN}✓${NC} Organized scripts into scripts/ subdirectories"

# =============================================================================
# STEP 4: Remove unnecessary files
# =============================================================================
echo -e "\n${YELLOW}━━━ STEP 4: Removing unnecessary files ━━━${NC}\n"

# Remove backup files
find . -name "*.backup" -delete 2>/dev/null || true
find . -name "*-backup.*" -delete 2>/dev/null || true
find . -name "*-old.*" -delete 2>/dev/null || true
find . -name "*.orig" -delete 2>/dev/null || true
echo -e "  ${GREEN}✓${NC} Removed backup files"

# Remove the old cleanup script (we have a new one)
[ -f "cleanup-exposed-credentials.sh" ] && rm "cleanup-exposed-credentials.sh"
echo -e "  ${GREEN}✓${NC} Removed old cleanup script"

# =============================================================================
# STEP 5: Run npm audit fix
# =============================================================================
echo -e "\n${YELLOW}━━━ STEP 5: Running npm audit fix ━━━${NC}\n"

# Backend
if [ -d "backend" ] && [ -f "backend/package.json" ]; then
    echo -e "  ${BLUE}→${NC} Running npm audit fix in backend/..."
    cd backend
    npm audit fix --force 2>/dev/null || echo -e "  ${YELLOW}⚠${NC} Some vulnerabilities may require manual review"
    cd ..
    echo -e "  ${GREEN}✓${NC} Backend audit complete"
else
    echo -e "  ${YELLOW}⚠${NC} Backend package.json not found"
fi

# Frontend
if [ -d "src/frontend" ] && [ -f "src/frontend/package.json" ]; then
    echo -e "  ${BLUE}→${NC} Running npm audit fix in src/frontend/..."
    cd src/frontend
    npm audit fix --force 2>/dev/null || echo -e "  ${YELLOW}⚠${NC} Some vulnerabilities may require manual review"
    cd ../..
    echo -e "  ${GREEN}✓${NC} Frontend audit complete"
else
    echo -e "  ${YELLOW}⚠${NC} Frontend package.json not found"
fi

# =============================================================================
# STEP 6: Update .gitignore
# =============================================================================
echo -e "\n${YELLOW}━━━ STEP 6: Updating .gitignore ━━━${NC}\n"

cat >> .gitignore << 'EOF'

# Additional ignores for public repo
*.local.md
*.credentials
.env.local
.env.*.local
*.pem
*.key
credentials/
secrets/
EOF

echo -e "  ${GREEN}✓${NC} Updated .gitignore"

# =============================================================================
# STEP 7: Create improved README
# =============================================================================
echo -e "\n${YELLOW}━━━ STEP 7: Creating improved README ━━━${NC}\n"

cat > README.md << 'EOF'
# APES - Decentralized Prediction Market Platform

A full-stack decentralized prediction market platform built on Solana, featuring on-chain betting, parlay tournaments, and social engagement mechanics.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          APES Platform                                   │
├─────────────────────────────────────────────────────────────────────────┤
│  Frontend (React/Vite)  │  Backend (Node/Express)  │  Smart Contracts   │
│  - Wallet Integration   │  - REST API              │  - Anchor/Rust     │
│  - Market UI            │  - PostgreSQL            │  - PDAs & Escrows  │
│  - Leaderboards         │  - Real-time sync        │  - Token Burns     │
└─────────────────────────────────────────────────────────────────────────┘
```

## 🔗 Deployed Contracts (Solana Mainnet)

| Contract | Address |
|----------|---------|
| Market System | `APESCaeLW5RuxNnpNARtDZnSgeVFC5f37Z3VFNKupJUS` |
| APES Token | `9BZJXtmfPpkHnM57gHEx5Pc9oQhLhJtr4mhCsNtttTts` |
| Platform State | `GD3SoR4aHLLtzY9jYZyL7qH64VA73waMtvH9KRSZ3Bgb` |
| Treasury | `APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z` |

## 🦀 Smart Contract Features

The Solana program (`src/smart_contracts/market_system/`) implements:

### Prediction Markets
- **Multi-option markets** (2-4 outcomes)
- **PDA-based escrow** for secure fund management
- **Proportional payout** calculation with u128 precision
- **Emergency withdraw** for cancelled markets

### Parlay System
- **Tournament-based** multi-selection betting
- **Dynamic multipliers** (base + increment per selection)
- **Exposure limits** to manage platform risk
- **Match resolution** with selection validation

### Security
- **Safe math** throughout (checked_add/mul/div/sub)
- **Access control** with admin + creator whitelist
- **Pool overflow protection** (MAX_POOL_SIZE)
- **Division by zero guards**
- **Escrow balance validation**

### Token Economics
- **Bet burn**: 2.5% of each bet burned
- **Claim burn**: 1.5% of winnings burned
- **Platform fee**: Configurable basis points
- **Creator fee**: Per-market fee rate

## 📁 Project Structure

```
├── src/
│   ├── smart_contracts/     # Solana/Anchor programs
│   │   └── market_system/   # Main prediction market program
│   └── frontend/            # React frontend
├── backend/                 # Express.js API server
├── docs/                    # Documentation
│   ├── deployment/          # Deployment guides
│   ├── security/            # Security documentation
│   ├── features/            # Feature documentation
│   └── api/                 # API documentation
├── scripts/                 # Utility scripts
└── tests/                   # Integration tests
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Rust & Anchor CLI
- Solana CLI
- PostgreSQL

### Development

```bash
# Backend
cd backend
npm install
npm run dev  # Port 5001

# Frontend
cd src/frontend
npm install
npm run dev  # Port 3000

# Smart Contracts
cd src/smart_contracts/market_system
anchor build
anchor test
```

## 📖 Documentation

- [Smart Contract Deep Dive](./SMART_CONTRACT_EXPLAINED.md)
- [Running the App](./RUNNING_THE_APP.md)
- [QA Testing Checklist](./QA_TESTING_CHECKLIST.md)

## 🛡️ Security

The smart contracts implement comprehensive security measures:
- Input validation on all user-provided data
- Bounds checking for all array accesses
- Authority verification on sensitive operations
- Reentrancy protection via account constraints

See [Security Documentation](./docs/security/) for full audit details.

## 📄 License

MIT License - See LICENSE for details.
EOF

echo -e "  ${GREEN}✓${NC} Created improved README.md"

# =============================================================================
# SUMMARY
# =============================================================================
echo -e "\n${BLUE}"
echo "╔═══════════════════════════════════════════════════════════════════════╗"
echo "║                         CLEANUP COMPLETE                              ║"
echo "╚═══════════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "  ${GREEN}✓${NC} Removed $REMOVED_FILES files with credentials"
echo -e "  ${GREEN}✓${NC} Moved $MOVED_DOCS documentation files"
echo -e "  ${GREEN}✓${NC} Organized scripts into subdirectories"
echo -e "  ${GREEN}✓${NC} Ran npm audit fix on frontend and backend"
echo -e "  ${GREEN}✓${NC} Updated .gitignore"
echo -e "  ${GREEN}✓${NC} Created improved README.md"

echo -e "\n${YELLOW}Next steps:${NC}"
echo "  1. Review the changes: git status"
echo "  2. Test the app still works: ./run-dev.sh"
echo "  3. Commit: git add -A && git commit -m 'chore: Clean up repo for public showcase'"
echo "  4. Make public: Go to GitHub repo settings → Change visibility"

echo -e "\n${BLUE}Good luck with your interview! 🚀${NC}\n"
