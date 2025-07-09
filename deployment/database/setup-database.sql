-- Meridian AI Database Setup
-- Run this in your Supabase SQL Editor

-- Drop existing tables if they exist (optional - only if you want to recreate)
-- DROP TABLE IF EXISTS user_corrections CASCADE;
-- DROP TABLE IF EXISTS learned_patterns CASCADE;

-- Create learned_patterns table
CREATE TABLE IF NOT EXISTS learned_patterns (
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

-- Create user_corrections table
CREATE TABLE IF NOT EXISTS user_corrections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID,
    original_description TEXT NOT NULL,
    corrected_category_code VARCHAR(10) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_learned_patterns_user_id ON learned_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_learned_patterns_pattern ON learned_patterns(pattern);
CREATE INDEX IF NOT EXISTS idx_user_corrections_user_id ON user_corrections(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE learned_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_corrections ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can only access their own learned patterns" ON learned_patterns
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own corrections" ON user_corrections
    FOR ALL USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON learned_patterns TO authenticated;
GRANT ALL ON user_corrections TO authenticated; 