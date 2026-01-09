#!/bin/bash

# Android Build Script for Telecom CRM
# This script initializes EAS (if needed) and builds an Android APK

echo "🚀 Starting Android build process..."
echo ""

# Check if user is logged in
echo "📝 Checking EAS authentication..."
npx eas-cli whoami || {
    echo "❌ Not logged in to EAS. Please run: npx eas-cli login"
    exit 1
}

# Initialize EAS project (only needed once)
echo ""
echo "🔧 Initializing EAS project..."
npx eas-cli init --force --non-interactive || echo "⚠️ EAS already initialized or init skipped"

# Build Android APK
echo ""
echo "📦 Building Android APK..."
echo "This will take several minutes. You can monitor progress at: https://expo.dev"
npx eas-cli build --platform android --profile preview --non-interactive

echo ""
echo "✅ Build complete! Check your EAS dashboard for the download link."
