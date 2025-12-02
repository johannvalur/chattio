#!/bin/bash
# Quick notarization setup with pre-filled Apple ID

set -e

APPLE_ID="johannvalursaevarsson@gmail.com"
APPLE_TEAM_ID="QD9KBHBRRZ"
CSC_NAME="Jóhann Sævarsson (QD9KBHBRRZ)"

echo "🔐 Quick Notarization Setup"
echo "==========================="
echo ""
echo "Apple ID: $APPLE_ID (detected from system)"
echo ""
echo "You need to create an app-specific password:"
echo "  1. Go to https://appleid.apple.com"
echo "  2. Sign in with your Apple ID"
echo "  3. Go to 'Security' → 'App-Specific Passwords'"
echo "  4. Click 'Generate Password'"
echo "  5. Name it 'Chattio Notarization'"
echo "  6. Copy the password (shown only once!)"
echo ""
read -p "Enter your app-specific password: " -s APPLE_APP_SPECIFIC_PASSWORD
echo ""
echo ""

# Set environment variables
export APPLE_ID="$APPLE_ID"
export APPLE_APP_SPECIFIC_PASSWORD="$APPLE_APP_SPECIFIC_PASSWORD"
export APPLE_TEAM_ID="$APPLE_TEAM_ID"
export CSC_NAME="$CSC_NAME"

echo "✓ Environment configured"
echo ""

# Unlock keychain
echo "🔓 Unlocking keychain..."
security unlock-keychain ~/Library/Keychains/login.keychain-db 2>&1 | grep -v "password" || true
echo ""

# Build with notarization
echo "🚀 Building with notarization..."
echo "   This will take 5-10 minutes..."
echo ""

npm run dist:mac

echo ""
echo "✅ Build complete! Checking notarization..."
sleep 5

if [ -d "dist/mac-arm64/Chattio.app" ]; then
    spctl --assess --verbose dist/mac-arm64/Chattio.app 2>&1
fi

