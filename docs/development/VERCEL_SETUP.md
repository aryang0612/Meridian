# Vercel Setup Guide

## Setting up OpenAI API Key

Your OpenAI API key is already configured locally in `.env.local`. To make the chat feature work on your live Vercel site, you need to add the API key to Vercel's environment variables.

### Option 1: Using Vercel CLI (Recommended)

1. Install Vercel CLI if you haven't already:
   ```bash
   npm install -g vercel
   ```

2. Run the setup script:
   ```bash
   ./scripts/setup-vercel-env.sh
   ```

### Option 2: Manual Setup via Vercel Dashboard

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your Meridian project
3. Go to **Settings** → **Environment Variables**
4. Add a new environment variable:
   - **Name**: `OPENAI_API_KEY`
   - **Value**: `[Your OpenAI API Key from .env.local]`
   - **Environment**: Select all (Production, Preview, Development)
5. Click **Save**
6. Redeploy your project

### Option 3: Using Vercel CLI Commands

```bash
# Set the environment variable
vercel env add OPENAI_API_KEY production
# Enter your API key when prompted

# Redeploy
vercel --prod
```

## Verification

After setting up the environment variable, your chat feature should work on the live site. You can test it by:

1. Going to your live Vercel URL
2. Opening the chat widget (bottom right corner)
3. Asking a question about Meridian AI

## Security Notes

- The API key is stored securely in Vercel's environment variables
- It's not exposed in your code or Git repository
- The `.env.local` file is already in `.gitignore` to prevent accidental commits 