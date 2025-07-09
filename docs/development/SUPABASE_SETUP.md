# 🚀 Supabase Setup for Meridian AI

## Overview
This guide will help you set up Supabase for storing learned patterns in your Meridian AI app.

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up/Login and create a new project
3. Choose a name (e.g., "meridian-ai")
4. Set a database password
5. Choose a region close to your users

## Step 2: Get Your Credentials

1. Go to **Settings** → **API** in your Supabase dashboard
2. Copy your **Project URL** and **anon public key**
3. Create a `.env.local` file in your project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

## Step 3: Create Database Tables

Run this SQL in your Supabase SQL Editor:

```sql
-- Create learned patterns table
CREATE TABLE learned_patterns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
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
  user_id UUID REFERENCES auth.users(id),
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
ON learned_patterns(pattern, user_id, organization_id) 
WHERE user_id IS NOT NULL AND organization_id IS NOT NULL;
```

## Step 4: Enable Row Level Security (Optional)

For multi-user security, enable RLS:

```sql
-- Enable RLS
ALTER TABLE learned_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_corrections ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own patterns" ON learned_patterns
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own patterns" ON learned_patterns
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own patterns" ON learned_patterns
  FOR UPDATE USING (auth.uid() = user_id);

-- Similar policies for user_corrections
CREATE POLICY "Users can view their own corrections" ON user_corrections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own corrections" ON user_corrections
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

## Step 5: Test the Setup

1. Restart your development server
2. Upload some transactions
3. Give thumbs up feedback on categorizations
4. Check the Supabase dashboard to see if patterns are being saved

## Benefits of Supabase

✅ **Multi-user support** - Each user has their own learned patterns
✅ **Cross-device sync** - Patterns work on any device
✅ **Real-time updates** - Changes sync instantly
✅ **Backup & recovery** - Data is safely stored in the cloud
✅ **Analytics** - Track usage patterns and improvements
✅ **Scalability** - Handles thousands of users

## Troubleshooting

### Patterns not saving?
- Check your environment variables
- Verify Supabase connection in browser console
- Check RLS policies if enabled

### Performance issues?
- Add more database indexes
- Implement caching for frequently used patterns
- Consider pagination for large datasets

## Next Steps

1. **User Authentication** - Add Supabase Auth for user management
2. **Organization Support** - Add multi-tenant features
3. **Analytics Dashboard** - Track learning improvements
4. **Pattern Sharing** - Allow users to share patterns
5. **Backup/Export** - Add data export features 