#!/bin/bash

# 🧹 Cleanup Exposed Credentials Script
# This script helps identify and clean up exposed Supabase credentials

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${RED}🚨 CLEANING UP EXPOSED SUPABASE CREDENTIALS 🚨${NC}"
echo "================================================"
echo ""

# The exposed credentials that need to be removed
EXPOSED_PASSWORD="uKF5DzUcfwoRlryr"
EXPOSED_PROJECT="xovbmbsnlcmxinlmlimz"
EXPOSED_SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvdmJtYnNubGNteGlubG1saW16Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODY0NjUwNSwiZXhwIjoyMDY0MjIyNTA1fQ.J3_P7Y-u1OGD9gZlQ1FCHx5pPccPLhfttZOiu-_myOU"

echo -e "${YELLOW}Step 1: Finding files with exposed credentials${NC}"
echo "----------------------------------------------"

# Find files with exposed credentials
echo "🔍 Scanning for files with exposed Supabase credentials..."
FILES_WITH_CREDS=$(find . -type f \( -name "*.js" -o -name "*.md" -o -name "*.sh" \) ! -path "./node_modules/*" ! -path "./.git/*" | xargs grep -l "$EXPOSED_PASSWORD\|$EXPOSED_PROJECT\|$EXPOSED_SERVICE_KEY" 2>/dev/null | head -20)

if [ -z "$FILES_WITH_CREDS" ]; then
    echo "✅ No files found with exposed credentials"
else
    echo "⚠️  Found exposed credentials in these files:"
    echo "$FILES_WITH_CREDS" | while read file; do
        echo "   📄 $file"
    done
fi

echo ""
echo -e "${YELLOW}Step 2: Files that need to be deleted or cleaned${NC}"
echo "------------------------------------------------"

# These are script files that contain hardcoded credentials and should be removed
SCRIPT_FILES_TO_DELETE=(
    "backend/scripts/setup-with-credentials.js"
    "backend/scripts/automated-migration.js"
    "backend/scripts/supabase-only-setup.js"
    "backend/scripts/refined-migration.js"
    "backend/scripts/verify-real-tweets.js"
    "backend/scripts/fetch-real-tweets.js"
    "backend/scripts/clean-fake-tweets.js"
    "backend/test-user-supabase.js"
    "backend/check-tables.js"
    "railway-deployment-check.js"
)

echo "🗑️  These script files contain hardcoded credentials and should be deleted:"
for file in "${SCRIPT_FILES_TO_DELETE[@]}"; do
    if [ -f "$file" ]; then
        echo "   ❌ $file (EXISTS - should be deleted)"
    else
        echo "   ✅ $file (not found)"
    fi
done

echo ""
echo -e "${YELLOW}Step 3: Configuration files that need environment variables${NC}"
echo "------------------------------------------------------------"

# These files should use environment variables instead
CONFIG_FILES=(
    "backend/config/supabase.js"
    "backend/config/database.js"
    "LOCAL_BACKEND_SETUP.md"
    "RUNNING_THE_APP.md"
)

echo "🔧 These files should use environment variables instead of hardcoded values:"
for file in "${CONFIG_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "   📝 $file (needs environment variable updates)"
    else
        echo "   ✅ $file (not found)"
    fi
done

echo ""
echo -e "${RED}⚠️  MANUAL ACTIONS REQUIRED:${NC}"
echo "================================"

cat << EOF

1. 🔄 ROTATE SUPABASE CREDENTIALS (Do this first!):
   - Go to https://supabase.com
   - Project: xovbmbsnlcmxinlmlimz  
   - Settings → Database → Reset database password
   - Settings → API → Regenerate Service Role key

2. 🗑️  DELETE SCRIPT FILES WITH HARDCODED CREDENTIALS:
   (These are temporary scripts that are no longer needed)
EOF

for file in "${SCRIPT_FILES_TO_DELETE[@]}"; do
    if [ -f "$file" ]; then
        echo "   rm '$file'"
    fi
done

cat << EOF

3. 📝 UPDATE YOUR .ENV FILES:
   Create backend/.env with your NEW credentials:
   
   SUPABASE_URL=https://xovbmbsnlcmxinlmlimz.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=[your-new-service-role-key]
   POSTGRES_PASSWORD=[your-new-database-password]

4. 🔍 VERIFY CLEANUP:
   After making changes, run this script again to verify no credentials remain.

EOF

echo -e "${YELLOW}Would you like me to help delete the script files? (y/n)${NC}"
read -r response

if [[ "$response" =~ ^[Yy]$ ]]; then
    echo ""
    echo "🗑️  Deleting script files with hardcoded credentials..."
    
    for file in "${SCRIPT_FILES_TO_DELETE[@]}"; do
        if [ -f "$file" ]; then
            echo "   Deleting: $file"
            rm "$file"
        fi
    done
    
    echo "✅ Script files deleted"
else
    echo "⚠️  Please manually delete the files listed above"
fi

echo ""
echo -e "${GREEN}Next steps:${NC}"
echo "1. Rotate your Supabase credentials (database password + service role key)"
echo "2. Update your backend/.env file with the new credentials"
echo "3. Run this script again to verify cleanup"
echo "4. Test your application with the new credentials"
echo "" 