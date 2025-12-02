#!/bin/bash

# Clean up node modules and cache
echo "🧹 Cleaning up node modules..."
rm -rf node_modules/
rm -f package-lock.json
rm -f yarn.lock

# Remove build artifacts
echo "🧹 Removing build artifacts..."
rm -rf dist/
rm -rf build/
rm -rf out/

# Clean temp and cache directories
echo "🧹 Cleaning temporary files..."
find . -type d -name "node_modules" -exec rm -rf {} + 2>/dev/null
find . -type f -name "*.log" -delete
find . -type f -name "*.log.*" -delete
find . -type f -name "*.tmp" -delete
find . -type d -name ".DS_Store" -delete
find . -name "*.swp" -delete
find . -name "*.swo" -delete

# Remove IDE specific files
echo "🧹 Removing IDE files..."
rm -rf .idea/
rm -rf .vscode/
rm -f *.sublime-workspace
rm -f *.sublime-project

# Clean npm cache
echo "🧹 Cleaning npm cache..."
npm cache clean --force

# Reinstall dependencies
echo "🔄 Reinstalling dependencies..."
npm install

echo "✨ Cleanup complete!"
