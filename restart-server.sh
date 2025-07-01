#!/bin/bash

# Kill any existing Next.js dev servers
pkill -f "next dev" 2>/dev/null

# Wait a moment for processes to clean up
sleep 1

# Start the development server
npm run dev 