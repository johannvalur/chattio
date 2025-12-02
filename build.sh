#!/bin/bash

# Clean previous builds
rm -rf dist

# Create necessary directories
mkdir -p dist/main dist/renderer

# Build main process
echo "Building main process..."
npx tsc -p tsconfig.json

# Copy preload script
echo "Copying preload script..."
cp src/main/preload.ts dist/main/preload.js

# Build renderer process
echo "Building renderer process..."
npx tsc -p tsconfig.renderer.json

# Copy static files
echo "Copying static files..."
cp -r src/renderer/*.html dist/renderer/ 2>/dev/null || :
cp -r src/renderer/*.css dist/renderer/ 2>/dev/null || :

echo "Build complete!"
