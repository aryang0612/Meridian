# 🚀 Supabase Authentication & Database Setup Guide

## 🎯 Overview

This guide will help you fix the Supabase authentication issues and establish a proper database connection for the Meridian AI application.

## 🚨 Current Issues Being Fixed

- ❌ Invalid Supabase anon key (not starting with "eyJ")
- ❌ Database UUID errors ("invalid input syntax for type uuid: 'undefined'")
- ❌ No user authentication preventing database operations
- ❌ Missing environment variables

## 📋 Step-by-Step Setup

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up/Login and create a new project
3. Choose a name (e.g., "meridian-ai-production")
4. Set a strong database password
5. Choose a region close to your users

### Step 2: Get Your Credentials

1. Go to **Settings** → **API** in your Supabase dashboard
2. Copy your **Project URL** and **anon public key**
3. **IMPORTANT**: The anon key must start with "eyJ" (it's a JWT token)

### Step 3: Create Environment File

Create a `.env.local` file in your project root:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-actual-anon-key-here

# OpenAI Configuration (if using AI features)
OPENAI_API_KEY=your-openai-api-key-here

# Development Settings
NODE_ENV=development
```

### Step 4: Create Database Tables

Run this SQL in your Supabase SQL Editor:

```sql
-- Create learned patterns table
CREATE TABLE learned_patterns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID,
  pattern TEXT NOT NULL,
  category_code VARCHAR(10) NOT NULL,
  confidence INTEGER NOT NULL DEFAULT 90,
  usage_count INTEGER NOT NULL DEFAULT 1,
  last_used TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user corrections table
CREATE TABLE user_corrections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID,
  original_description TEXT NOT NULL,
  corrected_category_code VARCHAR(10) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_learned_patterns_user ON learned_patterns(user_id);
CREATE INDEX idx_learned_patterns_pattern ON learned_patterns(pattern);
CREATE INDEX idx_user_corrections_user ON user_corrections(user_id);

-- Create unique constraint for patterns per user
CREATE UNIQUE INDEX idx_learned_patterns_unique 
ON learned_patterns(pattern, user_id) 
WHERE user_id IS NOT NULL;

-- Add updated_at trigger for learned_patterns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_learned_patterns_updated_at 
    BEFORE UPDATE ON learned_patterns 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Step 5: Enable Row Level Security (Optional but Recommended)

For multi-user security, enable RLS:

```sql
-- Enable RLS
ALTER TABLE learned_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_corrections ENABLE ROW LEVEL SECURITY;

-- Create policies for learned_patterns
CREATE POLICY "Users can view their own patterns" ON learned_patterns
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own patterns" ON learned_patterns
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own patterns" ON learned_patterns
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own patterns" ON learned_patterns
  FOR DELETE USING (auth.uid() = user_id);

-- Create policies for user_corrections
CREATE POLICY "Users can view their own corrections" ON user_corrections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own corrections" ON user_corrections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own corrections" ON user_corrections
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own corrections" ON user_corrections
  FOR DELETE USING (auth.uid() = user_id);
```

### Step 6: Enable Authentication (Optional)

If you want user authentication:

1. Go to **Authentication** → **Settings** in Supabase
2. Enable the providers you want (Email, Google, etc.)
3. Configure your site URL: `http://localhost:3000` (for development)

### Step 7: Test the Setup

1. Restart your development server: `npm run dev`
2. Check the console for these success messages:
   - ✅ Supabase client initialized successfully
   - ✅ Database connection test successful
   - 📊 Chart of Accounts initialized for province: ON (79 accounts)

## 🔧 Troubleshooting

### Issue: "Supabase anon key may be invalid"

**Solution**: 
- Check that your anon key starts with "eyJ"
- Copy the key exactly from Supabase Dashboard → Settings → API
- Make sure there are no extra spaces or characters

### Issue: "invalid input syntax for type uuid: 'undefined'"

**Solution**: 
- This is now fixed with proper UUID validation
- The app will work without authentication (using localStorage)
- For full features, set up user authentication

### Issue: "Missing Supabase credentials"

**Solution**:
- Create `.env.local` file in project root
- Add the environment variables as shown above
- Restart your development server

### Issue: Database tables don't exist

**Solution**:
- Run the SQL commands in Step 4
- Check that tables were created in Supabase → Table Editor

## 🚀 Features After Setup

✅ **Multi-user support** - Each user has their own learned patterns  
✅ **Cross-device sync** - Patterns work on any device  
✅ **Real-time updates** - Changes sync instantly  
✅ **Backup & recovery** - Data is safely stored in the cloud  
✅ **Analytics** - Track usage patterns and improvements  
✅ **Scalability** - Handles thousands of users  

## 🔄 Fallback Behavior

The application is designed to work gracefully without authentication:

- **With Authentication**: Full database sync, multi-device support
- **Without Authentication**: Uses localStorage, single-device only
- **Database Errors**: Automatically falls back to localStorage

## 📞 Support

If you encounter issues:

1. Check the browser console for error messages
2. Verify your environment variables are correct
3. Test the database connection in Supabase dashboard
4. Check that your Supabase project is active

## 🔐 Security Best Practices

1. **Never commit** `.env.local` to version control
2. **Use RLS policies** for production environments
3. **Rotate keys** regularly
4. **Monitor usage** in Supabase dashboard
5. **Set up backups** for production data

---

**Next Steps**: After setup, your application will have robust authentication and database connectivity with proper error handling and fallback mechanisms. 