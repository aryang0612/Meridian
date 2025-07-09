#!/bin/bash

# Meridian AI Development Server Starter
# This script ensures the dev server always starts from the correct directory

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Change to the meridian directory
cd "$SCRIPT_DIR/meridian"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Cannot find package.json in meridian directory"
    echo "Current directory: $(pwd)"
    exit 1
fi

echo "🚀 Starting Meridian AI Development Server..."
echo "📁 Working directory: $(pwd)"

# Kill any existing Next.js processes
echo "🔄 Stopping any existing Next.js processes..."
pkill -f "next dev" 2>/dev/null

# Wait a moment for processes to stop
sleep 2

# Start the development server
echo "▶️  Starting development server..."
npm run dev 