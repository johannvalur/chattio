#!/bin/bash
# Test script to verify code signing setup

set -e

echo "🔍 Testing Code Signing Configuration"
echo ""

# Set environment variables
export CSC_NAME="Developer ID Application: Jóhann Sævarsson (QD9KBHBRRZ)"
export APPLE_TEAM_ID="QD9KBHBRRZ"

echo "Environment variables:"
echo "  CSC_NAME: $CSC_NAME"
echo "  APPLE_TEAM_ID: $APPLE_TEAM_ID"
echo ""

# Verify certificate exists
echo "Checking certificate..."
CERT_CHECK=$(security find-identity -v -p codesigning | grep "Developer ID Application" | head -1)
if [ -z "$CERT_CHECK" ]; then
    echo "❌ Certificate not found!"
    exit 1
else
    echo "✓ Certificate found: $CERT_CHECK"
fi
echo ""

# Check keychain is unlocked
echo "Checking keychain..."
security unlock-keychain ~/Library/Keychains/login.keychain-db 2>&1 | grep -v "password" || true
echo ""

# Run a test build (just packaging, no full dist)
echo "Running test build to check code signing..."
echo ""

# Build with verbose output
npm run generate-icons
electron-builder --mac --dir --publish never 2>&1 | tee /tmp/build-output.log

echo ""
echo "Checking build output for signing messages..."
if grep -i "signing" /tmp/build-output.log; then
    echo "✓ Code signing detected in build output"
else
    echo "⚠️  No code signing detected in build output"
    echo ""
    echo "Checking for skipped messages..."
    if grep -i "skipped.*sign" /tmp/build-output.log; then
        echo "❌ Code signing was skipped!"
    fi
fi

echo ""
echo "Verifying built app..."
if [ -d "dist/mac-arm64/Chattio.app" ]; then
    echo "Checking signature..."
    codesign -dv --verbose=4 dist/mac-arm64/Chattio.app 2>&1 | grep -E "(Authority|Signature)" || true
fi

