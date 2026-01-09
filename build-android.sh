#!/bin/bash

# Android Build Script for Telecom CRM

echo "🚀 Starting Android build process..."
echo ""

# Check if user is logged in
echo "📝 Checking EAS authentication..."
if ! npx eas-cli whoami; then
    echo "❌ Not logged in to EAS. Please run: npx eas-cli login"
    exit 1
fi

# Initialize and build in one go - EAS will create project if needed
echo ""
echo "📦 Building Android APK..."
echo "This will take several minutes. EAS will create the project if it doesn't exist."
echo ""
npx eas-cli build --platform android --profile preview

echo ""
echo "✅ Build process complete! Check your EAS dashboard for the download link."
