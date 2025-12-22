#!/bin/bash
# Script to set up notarization and build with notarization

set -e

echo "🔐 Setting up notarization..."
echo ""

# Check if credentials are provided
if [ -z "$APPLE_ID" ] || [ -z "$APPLE_APP_SPECIFIC_PASSWORD" ]; then
    echo "⚠️  APPLE_ID and APPLE_APP_SPECIFIC_PASSWORD need to be set"
    echo ""
    echo "To get an app-specific password:"
    echo "1. Go to https://appleid.apple.com"
    echo "2. Sign in with your Apple ID"
    echo "3. Go to Security section"
    echo "4. Under 'App-Specific Passwords', click 'Generate Password'"
    echo "5. Name it 'Chattio Notarization'"
    echo "6. Copy the generated password (you'll only see it once!)"
    echo ""
    echo "Then set the environment variables:"
    echo "  export APPLE_ID=\"your-apple-id@example.com\""
    echo "  export APPLE_APP_SPECIFIC_PASSWORD=\"your-app-specific-password\""
    echo ""
    echo "Or run this script with them set:"
    echo "  APPLE_ID=\"your-id@example.com\" APPLE_APP_SPECIFIC_PASSWORD=\"your-password\" ./scripts/notarize.sh"
    echo ""
    exit 1
fi

# Set up code signing
export CSC_NAME="Jóhann Sævarsson (QD9KBHBRRZ)"
export APPLE_TEAM_ID="QD9KBHBRRZ"
export APPLE_ID_PASSWORD="$APPLE_APP_SPECIFIC_PASSWORD"

echo "✓ Environment variables set:"
echo "  APPLE_ID: $APPLE_ID"
echo "  APPLE_APP_SPECIFIC_PASSWORD: [hidden]"
echo "  APPLE_TEAM_ID: $APPLE_TEAM_ID"
echo "  CSC_NAME: $CSC_NAME"
echo ""

# Unlock keychain
echo "Unlocking keychain..."
security unlock-keychain ~/Library/Keychains/login.keychain-db 2>&1 | grep -v "password" || true
echo ""

# Build with notarization
echo "🚀 Building with code signing and notarization..."
echo "This will take 5-10 minutes (notarization happens after build)..."
echo ""

npm run dist:mac

echo ""
echo "✅ Build complete!"
echo ""
echo "Verifying notarization status..."
sleep 2

# Check notarization
if [ -d "dist/mac-arm64/Chattio.app" ]; then
    echo ""
    echo "Checking signature..."
    codesign -dv --verbose=4 dist/mac-arm64/Chattio.app 2>&1 | grep -E "(Authority|TeamIdentifier)" | head -2
    
    echo ""
    echo "Checking Gatekeeper assessment..."
    spctl --assess --verbose dist/mac-arm64/Chattio.app 2>&1 || echo "Note: If rejected, notarization may still be processing (can take 5-10 minutes)"
fi

