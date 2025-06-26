#!/bin/bash

# Exit on error
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${GREEN}Building Achievement Watcher...${NC}"

# Check for required tools
command -v npm >/dev/null 2>&1 || { echo -e "${RED}Error: npm is required but not installed.${NC}" >&2; exit 1; }
command -v electron-builder >/dev/null 2>&1 || { echo -e "${RED}Error: electron-builder is required but not installed.${NC}" >&2; exit 1; }

# Install dependencies
echo "Installing dependencies..."
npm install

# Build the application
echo "Building application..."
npm run build

# Create AppImage
echo "Creating AppImage..."
electron-builder --linux AppImage

echo -e "${GREEN}Build complete! AppImage can be found in the dist directory.${NC}"
