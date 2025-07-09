#!/bin/bash

# Clear Next.js cache for performance improvements
echo "🧹 Clearing Next.js cache..."
rm -rf .next/cache
rm -rf .next/server
rm -rf .next/static

# Clear node_modules cache
echo "🧹 Clearing npm cache..."
npm cache clean --force

# Clear temporary files
echo "🧹 Clearing temporary files..."
rm -rf node_modules/.cache
rm -rf .next/trace

echo "✅ Cache cleared successfully!"
echo "💡 Tip: Run 'npm run dev' to restart the development server" 