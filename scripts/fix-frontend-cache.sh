#!/bin/bash

echo "🔧 PRIMAPE Frontend Cache Fix"
echo "============================="
echo ""

echo "📱 Refreshing frontend to pick up token decimals fix..."

# Kill frontend dev server
echo "🛑 Stopping frontend dev server..."
pkill -f "vite"
pkill -f "npm run dev" 
sleep 2

# Clear browser cache instruction
echo ""
echo "🔄 NEXT STEPS:"
echo "1. Hard refresh your browser (Cmd+Shift+R or Ctrl+Shift+R)"
echo "2. Clear application storage in DevTools if needed"
echo "3. The token decimals are now correctly set to 6 (was 9)"
echo "4. Market percentages should now calculate correctly"
echo ""

echo "✅ Frontend cache fix complete!"
echo "The token decimals mismatch has been resolved." 