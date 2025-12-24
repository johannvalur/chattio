#!/bin/bash

# Build script for both macOS and Windows
# This helps ensure both builds are created before syncing downloads

set -e

echo "🔨 Building Chattio for all platforms..."

# Check if we're on macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
  echo "✅ Detected macOS - building Mac version"
  npm run dist:mac
  
  echo "⚠️  Note: Windows builds require a Windows machine or CI/CD"
  echo "   Skipping Windows build on macOS"
else
  echo "⚠️  Not on macOS - skipping Mac build"
  
  # Check if we're on Windows
  if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    echo "✅ Detected Windows - building Windows version"
    npm run dist:win
  fi
fi

echo ""
echo "✅ Build complete!"
echo ""
echo "Next steps:"
echo "1. To test locally: Check the dist/ folder for installers"
echo "2. To release: npm run version:patch && git push --tags"
echo "3. GitHub Actions will build both platforms automatically"
