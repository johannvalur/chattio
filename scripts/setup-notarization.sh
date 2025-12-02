#!/bin/bash
# Interactive script to set up notarization and build with notarization

set -e

echo "🔐 Notarization Setup & Build"
echo "=============================="
echo ""

# Check if credentials are already set
if [ -n "$APPLE_ID" ] && [ -n "$APPLE_APP_SPECIFIC_PASSWORD" ]; then
    echo "✓ Credentials already set in environment"
    USE_EXISTING=true
else
    USE_EXISTING=false
    echo "To notarize the app, you need:"
    echo "  1. Your Apple ID (email)"
    echo "  2. An app-specific password (not your regular Apple ID password)"
    echo ""
    echo "📝 Getting an App-Specific Password:"
    echo "  1. Go to https://appleid.apple.com"
    echo "  2. Sign in with your Apple ID"
    echo "  3. Go to 'Security' section"
    echo "  4. Under 'App-Specific Passwords', click 'Generate Password'"
    echo "  5. Name it 'Chattio Notarization'"
    echo "  6. Copy the password (you'll only see it once!)"
    echo ""
    read -p "Press Enter when you have your app-specific password ready..."
    echo ""
    
    # Prompt for Apple ID
    read -p "Enter your Apple ID (email): " APPLE_ID_INPUT
    APPLE_ID="$APPLE_ID_INPUT"
    
    # Prompt for app-specific password (hidden)
    echo -n "Enter your app-specific password: "
    read -s APPLE_APP_SPECIFIC_PASSWORD_INPUT
    echo ""
    APPLE_APP_SPECIFIC_PASSWORD="$APPLE_APP_SPECIFIC_PASSWORD_INPUT"
fi

# Set up all environment variables
export CSC_NAME="Jóhann Sævarsson (QD9KBHBRRZ)"
export APPLE_TEAM_ID="QD9KBHBRRZ"
export APPLE_ID="$APPLE_ID"
export APPLE_APP_SPECIFIC_PASSWORD="$APPLE_APP_SPECIFIC_PASSWORD"

echo ""
echo "✓ Environment configured:"
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
echo "⏳ Checking notarization status..."
sleep 3

# Check notarization
if [ -d "dist/mac-arm64/Chattio.app" ]; then
    echo ""
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
        echo "   Users will NOT see the 'damaged app' error!"
    elif echo "$SPCTL_RESULT" | grep -q "Unnotarized"; then
        echo "⏳ Notarization is still processing..."
        echo "   Apple's notarization can take 5-10 minutes to complete."
        echo "   Check status with: spctl --assess --verbose dist/mac-arm64/Chattio.app"
        echo ""
        echo "   Once notarized, users will NOT see the 'damaged app' error!"
    else
        echo "⚠️  Check the result above. Notarization may still be processing."
    fi
fi

