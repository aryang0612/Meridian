# Environment Setup Guide

## OpenAI API Key Setup

The chat functionality requires a valid OpenAI API key. Here's how to set it up:

### Option 1: Get a New API Key (Recommended)
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy the new key (starts with `sk-`)

### Option 2: Use Fallback Mode (Current)
The application is currently running in fallback mode, which provides helpful responses without requiring an OpenAI API key.

## Environment Variables

### Required for Full Functionality
```bash
# .env.local
OPENAI_API_KEY=sk-your-actual-api-key-here
```

### Current Status
- ✅ Chart of Accounts CSV Loading: Working
- ✅ Reports Generation: Working with sample data
- ✅ File Upload: Working
- ✅ PDF Export: Working
- ✅ Chat Support: Working (fallback mode)
- ⚠️ OpenAI Chat: Requires valid API key for full AI responses

## Testing the Setup

1. **Test Chat API:**
   ```bash
   curl -X POST http://localhost:3000/api/chat \
     -H "Content-Type: application/json" \
     -d '{"message": "How do I upload a file?"}'
   ```

2. **Check Server Logs:**
   - Look for "Using fallback response" messages
   - No more 401 API key errors

## Fallback Mode Features

When OpenAI API is not available, the chat provides:
- File upload instructions
- AI categorization explanations
- Export guidance
- Security information
- General Meridian AI support

The application remains fully functional for all core bookkeeping features. 