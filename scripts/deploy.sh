#!/bin/bash

# Meridian AI - Safe Deployment Script
# This script safely builds and prepares the application for deployment

set -e  # Exit on any error

echo "🚀 Starting Meridian AI Deployment Process..."

# Step 1: Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf .next
rm -rf node_modules/.cache

# Step 2: Install dependencies
echo "📦 Installing dependencies..."
npm ci --only=production

# Step 3: Build the application
echo "🔨 Building application..."
npm run build

# Step 4: Run tests (if available)
if [ -f "package.json" ] && grep -q "\"test\":" package.json; then
    echo "🧪 Running tests..."
    npm test
fi

# Step 5: Check build output
echo "✅ Checking build output..."
if [ -d ".next" ]; then
    echo "✅ Build successful! Application is ready for deployment."
    echo "📊 Build size: $(du -sh .next | cut -f1)"
else
    echo "❌ Build failed! Please check the build logs."
    exit 1
fi

echo "🎉 Deployment preparation complete!"
echo "📝 Next steps:"
echo "   1. Review the build output"
echo "   2. Test the application locally"
echo "   3. Deploy to your chosen platform" 