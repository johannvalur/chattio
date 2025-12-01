#!/bin/bash
# Helper script to set up code signing environment variables
# Run this before building: source scripts/setup-code-signing.sh

echo "🔐 Setting up code signing environment variables..."
echo ""

# Certificate name (from your installed certificate)
export CSC_NAME="Developer ID Application: Jóhann Sævarsson (QD9KBHBRRZ)"
echo "✓ CSC_NAME set to: $CSC_NAME"

# Team ID (extracted from certificate name)
export APPLE_TEAM_ID="QD9KBHBRRZ"
echo "✓ APPLE_TEAM_ID set to: $APPLE_TEAM_ID"

# Check if Apple ID is already set
if [ -z "$APPLE_ID" ]; then
    echo ""
    echo "⚠️  APPLE_ID not set. Please set it:"
    echo "   export APPLE_ID=\"your-apple-id@example.com\""
    echo ""
    echo "   Then create an app-specific password at:"
    echo "   https://appleid.apple.com → Security → App-Specific Passwords"
    echo ""
    echo "   And set it:"
    echo "   export APPLE_ID_PASSWORD=\"your-app-specific-password\""
else
    echo "✓ APPLE_ID is set: $APPLE_ID"
fi

# Check if app-specific password is set
if [ -z "$APPLE_ID_PASSWORD" ]; then
    echo ""
    echo "⚠️  APPLE_ID_PASSWORD not set."
    echo "   Create one at: https://appleid.apple.com → Security → App-Specific Passwords"
    echo "   Then set it: export APPLE_ID_PASSWORD=\"your-password\""
else
    echo "✓ APPLE_ID_PASSWORD is set (hidden)"
fi

echo ""
echo "📝 To use these variables, run:"
echo "   source scripts/setup-code-signing.sh"
echo ""
echo "   Then set your Apple ID credentials:"
echo "   export APPLE_ID=\"your-apple-id@example.com\""
echo "   export APPLE_ID_PASSWORD=\"your-app-specific-password\""
echo ""
echo "   Then build:"
echo "   npm run dist:mac"
echo ""

