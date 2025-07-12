-- Meridian AI Database Setup
-- Run this in your Supabase SQL Editor

-- Drop existing tables if they exist (optional - only if you want to recreate)
-- DROP TABLE IF EXISTS user_corrections CASCADE;
-- DROP TABLE IF EXISTS learned_patterns CASCADE;
-- DROP TABLE IF EXISTS user_categorization_rules CASCADE;

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

-- Create user_categorization_rules table
CREATE TABLE IF NOT EXISTS user_categorization_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    match_type VARCHAR(20) NOT NULL CHECK (match_type IN ('contains', 'fuzzy', 'regex', 'exact')),
    keyword VARCHAR(255) NOT NULL,
    category_code VARCHAR(10) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    usage_count INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Ensure unique combination of user + keyword + category for each match type
    UNIQUE(user_id, keyword, category_code, match_type)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_learned_patterns_user_id ON learned_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_learned_patterns_pattern ON learned_patterns(pattern);
CREATE INDEX IF NOT EXISTS idx_user_corrections_user_id ON user_corrections(user_id);
CREATE INDEX IF NOT EXISTS idx_user_categorization_rules_user_id ON user_categorization_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_user_categorization_rules_keyword ON user_categorization_rules(keyword);
CREATE INDEX IF NOT EXISTS idx_user_categorization_rules_active ON user_categorization_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_user_categorization_rules_usage ON user_categorization_rules(usage_count DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE learned_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_categorization_rules ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for learned_patterns
CREATE POLICY "Users can only access their own learned patterns" ON learned_patterns
    FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for user_corrections
CREATE POLICY "Users can only access their own corrections" ON user_corrections
    FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for user_categorization_rules
CREATE POLICY "Users can view own categorization rules" ON user_categorization_rules
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own categorization rules" ON user_categorization_rules
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own categorization rules" ON user_categorization_rules
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own categorization rules" ON user_categorization_rules
    FOR DELETE USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to automatically update the updated_at timestamp for user_categorization_rules
CREATE TRIGGER update_user_categorization_rules_updated_at
    BEFORE UPDATE ON user_categorization_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to safely increment usage count
CREATE OR REPLACE FUNCTION increment_usage_count(row_id UUID)
RETURNS INTEGER AS $$
DECLARE
    current_count INTEGER;
BEGIN
    SELECT usage_count INTO current_count 
    FROM user_categorization_rules 
    WHERE id = row_id;
    
    RETURN COALESCE(current_count, 0) + 1;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT ALL ON learned_patterns TO authenticated;
GRANT ALL ON user_corrections TO authenticated;
GRANT ALL ON user_categorization_rules TO authenticated;

-- Add helpful comments
COMMENT ON TABLE learned_patterns IS 'Stores AI-learned patterns from user corrections';
COMMENT ON TABLE user_corrections IS 'Stores user corrections for AI learning';
COMMENT ON TABLE user_categorization_rules IS 'Stores custom categorization rules created by users when they manually categorize transactions';
COMMENT ON COLUMN user_categorization_rules.match_type IS 'Type of matching: contains, fuzzy, regex, or exact';
COMMENT ON COLUMN user_categorization_rules.keyword IS 'The keyword or pattern to match against transaction descriptions';
COMMENT ON COLUMN user_categorization_rules.category_code IS 'The account code to assign when this rule matches';
COMMENT ON COLUMN user_categorization_rules.usage_count IS 'Number of times this rule has been applied to transactions';
COMMENT ON COLUMN user_categorization_rules.is_active IS 'Whether this rule is currently active and should be applied';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Meridian AI Database Setup Complete!';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Tables Created:';
    RAISE NOTICE '   - learned_patterns (AI learning from corrections)';
    RAISE NOTICE '   - user_corrections (user feedback)';
    RAISE NOTICE '   - user_categorization_rules (custom keyword rules)';
    RAISE NOTICE '';
    RAISE NOTICE '🔐 Security Features:';
    RAISE NOTICE '   - Row Level Security (RLS) enabled';
    RAISE NOTICE '   - User-specific data isolation';
    RAISE NOTICE '   - Automatic timestamp updates';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Ready for Production!';
END $$; 