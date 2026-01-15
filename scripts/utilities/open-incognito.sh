#!/bin/bash

# Open the app in incognito/private mode to avoid cache issues

echo "🌐 Opening PRIMAPE Markets in incognito mode..."
echo "This ensures you're using the latest code without cache issues."

# Detect OS and browser
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    if [ -d "/Applications/Google Chrome.app" ]; then
        open -na "Google Chrome" --args --incognito "http://localhost:3000"
        echo "✅ Opened in Chrome incognito mode"
    elif [ -d "/Applications/Brave Browser.app" ]; then
        open -na "Brave Browser" --args --incognito "http://localhost:3000"
        echo "✅ Opened in Brave private mode"
    elif [ -d "/Applications/Safari.app" ]; then
        osascript -e 'tell application "Safari" to open location "http://localhost:3000"'
        echo "✅ Opened in Safari (use File > New Private Window)"
    else
        echo "❌ No supported browser found. Please open http://localhost:3000 in incognito mode manually."
    fi
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    if command -v google-chrome &> /dev/null; then
        google-chrome --incognito "http://localhost:3000" &
        echo "✅ Opened in Chrome incognito mode"
    elif command -v firefox &> /dev/null; then
        firefox --private-window "http://localhost:3000" &
        echo "✅ Opened in Firefox private mode"
    else
        echo "❌ No supported browser found. Please open http://localhost:3000 in incognito mode manually."
    fi
else
    echo "❌ Unsupported OS. Please open http://localhost:3000 in incognito mode manually."
fi

echo ""
echo "📋 Quick Test Steps:"
echo "1. Connect your wallet (authorized: 4FxpxY3RRN4GQnSTTdZe2MEpRQCdTVnV3mX9Yf46vKoS)"
echo "2. Go to Admin → Create Market"
echo "3. Create a test market"
echo "4. Place a bet on the market"
echo "5. Check console for: 🔥 Believe burn successful: 1 tokens burned"
echo "6. Check Network tab for burnAmount: 1 (not 1000000)" 