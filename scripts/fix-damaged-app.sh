#!/bin/bash
# Script to fix "damaged app" error on macOS
# This removes the quarantine attribute that macOS adds to downloaded files

set -e

APP_PATH="$1"

if [ -z "$APP_PATH" ]; then
    echo "🔧 Fix 'Damaged App' Error"
    echo "=========================="
    echo ""
    echo "This script removes the quarantine attribute that macOS adds to downloaded apps."
    echo ""
    echo "Usage:"
    echo "  ./scripts/fix-damaged-app.sh /path/to/Chattio.app"
    echo ""
    echo "Examples:"
    echo "  ./scripts/fix-damaged-app.sh ~/Downloads/Chattio.app"
    echo "  ./scripts/fix-damaged-app.sh /Applications/Chattio.app"
    echo ""
    echo "After running this script, you should be able to open the app normally."
    exit 1
fi

# Check if path exists
if [ ! -d "$APP_PATH" ]; then
    echo "❌ Error: $APP_PATH does not exist or is not a directory"
    exit 1
fi

# Check if it's actually an .app bundle
if [[ ! "$APP_PATH" =~ \.app$ ]]; then
    echo "⚠️  Warning: $APP_PATH doesn't appear to be an .app bundle"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "🔍 Checking quarantine status..."
QUARANTINE=$(xattr -l "$APP_PATH" 2>/dev/null | grep "com.apple.quarantine" || true)

if [ -z "$QUARANTINE" ]; then
    echo "ℹ️  No quarantine attribute found."
    echo ""
    echo "If you're still seeing the 'damaged app' error, try:"
    echo "  1. Right-click the app and select 'Open' (you may need to do this twice)"
    echo "  2. Or check if the app needs to be notarized (see CODE_SIGNING.md)"
else
    echo "🔓 Removing quarantine attribute..."
    xattr -d com.apple.quarantine "$APP_PATH" 2>/dev/null
    
    if [ $? -eq 0 ]; then
        echo "✅ Quarantine attribute removed successfully!"
        echo ""
        echo "You can now open the app normally by double-clicking it."
    else
        echo "❌ Failed to remove quarantine attribute"
        echo "Try running with sudo: sudo xattr -d com.apple.quarantine \"$APP_PATH\""
        exit 1
    fi
fi

echo ""
echo "📋 Verifying app signature..."
SIGNATURE=$(codesign -dv --verbose=4 "$APP_PATH" 2>&1 | grep "Authority" | head -1 || echo "Not signed")
echo "   $SIGNATURE"

if echo "$SIGNATURE" | grep -q "Developer ID"; then
    echo "✅ App is code signed"
else
    echo "⚠️  App is not code signed (this is why macOS shows it as damaged)"
    echo "   See CODE_SIGNING.md for instructions on code signing and notarization"
fi

