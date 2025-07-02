#!/bin/bash

# Script to set up Vercel environment variables
echo "🚀 Setting up Vercel environment variables..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI is not installed. Please install it first:"
    echo "npm install -g vercel"
    exit 1
fi

# Read the API key from .env.local
if [ -f .env.local ]; then
    OPENAI_API_KEY=$(grep "OPENAI_API_KEY=" .env.local | cut -d '=' -f2)
    if [ -n "$OPENAI_API_KEY" ]; then
        echo "✅ Found OpenAI API key in .env.local"
        
        # Set the environment variable in Vercel
        echo "🔧 Setting OPENAI_API_KEY in Vercel..."
        vercel env add OPENAI_API_KEY production <<< "$OPENAI_API_KEY"
        vercel env add OPENAI_API_KEY preview <<< "$OPENAI_API_KEY"
        vercel env add OPENAI_API_KEY development <<< "$OPENAI_API_KEY"
        
        echo "✅ Environment variables set successfully!"
        echo "🔄 Redeploying to apply changes..."
        vercel --prod
    else
        echo "❌ No OPENAI_API_KEY found in .env.local"
        exit 1
    fi
else
    echo "❌ .env.local file not found"
    exit 1
fi 