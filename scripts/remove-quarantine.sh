#!/bin/bash
# Script to remove quarantine attribute from Chattio.app
# This allows the app to run on macOS without Gatekeeper blocking it

APP_PATH="$1"

if [ -z "$APP_PATH" ]; then
    echo "Usage: ./scripts/remove-quarantine.sh /path/to/Chattio.app"
    echo ""
    echo "Example:"
    echo "  ./scripts/remove-quarantine.sh ~/Downloads/Chattio.app"
    echo "  ./scripts/remove-quarantine.sh /Applications/Chattio.app"
    exit 1
fi

if [ ! -d "$APP_PATH" ]; then
    echo "Error: $APP_PATH does not exist or is not a directory"
    exit 1
fi

echo "Removing quarantine attribute from $APP_PATH..."
xattr -d com.apple.quarantine "$APP_PATH" 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✓ Quarantine attribute removed successfully"
    echo "You can now open the app normally."
else
    echo "Note: No quarantine attribute found (or already removed)"
    echo "If the app still won't open, try:"
    echo "  1. Right-click the app and select 'Open'"
    echo "  2. Or run: sudo spctl --master-disable (not recommended)"
fi

