#!/bin/bash

# Build the project
./build.sh

# Start the app using npx
echo "Starting Electron app..."
npx electron .
