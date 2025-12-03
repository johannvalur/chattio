#!/bin/bash
# Fix notarization environment variables
# Unsets empty or invalid credentials to prevent electron-builder errors

# Unset if empty or just whitespace
if [ -z "${APPLE_ID// }" ]; then
    unset APPLE_ID
    echo "⚠️  APPLE_ID is empty or not set - unsetting"
fi

if [ -z "${APPLE_APP_SPECIFIC_PASSWORD// }" ]; then
    unset APPLE_APP_SPECIFIC_PASSWORD
    echo "⚠️  APPLE_APP_SPECIFIC_PASSWORD is empty or not set - unsetting"
fi

# Only set APPLE_TEAM_ID if not already set
if [ -z "$APPLE_TEAM_ID" ]; then
    export APPLE_TEAM_ID="QD9KBHBRRZ"
fi

# Set code signing
export CSC_NAME="Jóhann Sævarsson (QD9KBHBRRZ)"

echo ""
echo "Current notarization environment:"
echo "  APPLE_ID: ${APPLE_ID:-not set}"
echo "  APPLE_APP_SPECIFIC_PASSWORD: ${APPLE_APP_SPECIFIC_PASSWORD:+set (hidden)}${APPLE_APP_SPECIFIC_PASSWORD:-not set}"
echo "  APPLE_TEAM_ID: $APPLE_TEAM_ID"
echo "  CSC_NAME: $CSC_NAME"
echo ""

if [ -n "$APPLE_ID" ] && [ -n "$APPLE_APP_SPECIFIC_PASSWORD" ]; then
    echo "✓ Notarization will be enabled"
else
    echo "⚠️  Notarization will be skipped (credentials not provided)"
fi

