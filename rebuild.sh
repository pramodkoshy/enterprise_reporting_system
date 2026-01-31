#!/bin/bash

# rebuild.sh - Clean and rebuild the Enterprise Reporting System
# This script clears all build artifacts and reinstalls dependencies

set -e  # Exit on error

echo "=========================================="
echo "Enterprise Reporting System - Rebuild"
echo "=========================================="
echo ""

# Step 1: Clear Next.js build cache
echo "Step 1: Clearing Next.js build cache..."
rm -rf .next
echo "✓ Cleared .next directory"
echo ""

# Step 2: Clear node_modules for fresh install
echo "Step 2: Clearing node_modules..."
rm -rf node_modules
echo "✓ Cleared node_modules directory"
echo ""

# Step 3: Clear package-lock.json
echo "Step 3: Clearing package-lock.json..."
rm -f package-lock.json
echo "✓ Cleared package-lock.json"
echo ""

# Step 4: Install dependencies
echo "Step 4: Installing dependencies..."
npm install
echo "✓ Dependencies installed"
echo ""

# Step 5: Create production build (optional)
echo "Step 5: Creating production build..."
npm run build
echo "✓ Production build created"
echo ""

echo "=========================================="
echo "Rebuild completed successfully!"
echo "=========================================="
echo ""
echo "To start the development server, run:"
echo "  ./start.sh"
echo ""
echo "To start the production server, run:"
echo "  npm start"
