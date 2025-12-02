#!/bin/bash
# Build script for macOS that handles notarization environment properly

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

# Source the fix script to clean up environment variables
source "$SCRIPT_DIR/fix-notarization-env.sh" 2>/dev/null || {
  # If sourcing fails, manually clean up empty variables
  if [ -z "${APPLE_ID// }" ]; then
    unset APPLE_ID
  fi
  if [ -z "${APPLE_APP_SPECIFIC_PASSWORD// }" ]; then
    unset APPLE_APP_SPECIFIC_PASSWORD
  fi
  export CSC_NAME="${CSC_NAME:-Jóhann Sævarsson (QD9KBHBRRZ)}"
  export APPLE_TEAM_ID="${APPLE_TEAM_ID:-QD9KBHBRRZ}"
}

# Generate icons
npm run generate-icons

# Build with electron-builder
electron-builder --mac

# Sync downloads
npm run sync:downloads

