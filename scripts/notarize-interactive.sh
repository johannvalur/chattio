#!/bin/bash
# Interactive script to set up notarization and build

set -e

echo "🔐 Notarization Setup"
echo "===================="
echo ""

# Check if credentials are already set
if [ -n "$APPLE_ID" ] && [ -n "$APPLE_APP_SPECIFIC_PASSWORD" ]; then
    echo "✓ Credentials already set in environment"
    USE_ENV=true
else
    USE_ENV=false
    echo "Please provide your Apple ID credentials for notarization:"
    echo ""
    echo "📝 Note: You need an app-specific password, not your regular Apple ID password."
    echo "   Get one at: https://appleid.apple.com → Security → App-Specific Passwords"
    echo ""
    
    # Prompt for Apple ID
    read -p "Enter your Apple ID (email): " APPLE_ID_INPUT
    APPLE_ID="$APPLE_ID_INPUT"
    
    # Prompt for app-specific password (hidden)
    echo -n "Enter your app-specific password: "
    read -s APPLE_APP_SPECIFIC_PASSWORD_INPUT
    echo ""
    APPLE_APP_SPECIFIC_PASSWORD="$APPLE_APP_SPECIFIC_PASSWORD_INPUT"
    
    echo ""
fi

# Set up code signing
export CSC_NAME="Jóhann Sævarsson (QD9KBHBRRZ)"
export APPLE_TEAM_ID="QD9KBHBRRZ"
export APPLE_ID="$APPLE_ID"
export APPLE_APP_SPECIFIC_PASSWORD="$APPLE_APP_SPECIFIC_PASSWORD"

echo "✓ Environment variables configured:"
echo "  APPLE_ID: $APPLE_ID"
echo "  APPLE_APP_SPECIFIC_PASSWORD: [hidden]"
echo "  APPLE_TEAM_ID: $APPLE_TEAM_ID"
echo "  CSC_NAME: $CSC_NAME"
echo ""

# Unlock keychain
echo "🔓 Unlocking keychain..."
security unlock-keychain ~/Library/Keychains/login.keychain-db 2>&1 | grep -v "password" || true
echo ""

# Build with notarization
echo "🚀 Building with code signing and notarization..."
echo "   This will take 5-10 minutes (notarization happens after build)..."
echo ""

npm run dist:mac

echo ""
echo "✅ Build complete!"
echo ""
echo "⏳ Notarization may still be processing..."
echo "   It can take 5-10 minutes for Apple to process the notarization."
echo ""

# Wait a bit for notarization to start
sleep 3

# Check notarization status
if [ -d "dist/mac-arm64/Chattio.app" ]; then
    echo "📋 Verification Results:"
    echo ""
    
    echo "Signature:"
    codesign -dv --verbose=4 dist/mac-arm64/Chattio.app 2>&1 | grep -E "(Authority|TeamIdentifier)" | head -2
    echo ""
    
    echo "Gatekeeper Assessment:"
    SPCTL_RESULT=$(spctl --assess --verbose dist/mac-arm64/Chattio.app 2>&1)
    echo "$SPCTL_RESULT"
    echo ""
    
    if echo "$SPCTL_RESULT" | grep -q "accepted"; then
        echo "✅ SUCCESS! App is signed and notarized!"
    elif echo "$SPCTL_RESULT" | grep -q "Unnotarized"; then
        echo "⏳ Notarization is still processing. Wait a few minutes and check again with:"
        echo "   spctl --assess --verbose dist/mac-arm64/Chattio.app"
    else
        echo "⚠️  Check the result above. Notarization may still be processing."
    fi
fi

