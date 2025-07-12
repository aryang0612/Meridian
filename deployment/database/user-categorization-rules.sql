-- ============================================================================
-- User Categorization Rules Table
-- Stores custom categorization rules created by users for their transactions
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_categorization_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
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

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_categorization_rules_user_id ON user_categorization_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_user_categorization_rules_keyword ON user_categorization_rules(keyword);
CREATE INDEX IF NOT EXISTS idx_user_categorization_rules_active ON user_categorization_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_user_categorization_rules_usage ON user_categorization_rules(usage_count DESC);

-- Add RLS (Row Level Security) to ensure users can only access their own rules
ALTER TABLE user_categorization_rules ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own rules
CREATE POLICY "Users can view own categorization rules" ON user_categorization_rules
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own rules
CREATE POLICY "Users can insert own categorization rules" ON user_categorization_rules
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own rules
CREATE POLICY "Users can update own categorization rules" ON user_categorization_rules
    FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete their own rules
CREATE POLICY "Users can delete own categorization rules" ON user_categorization_rules
    FOR DELETE USING (auth.uid() = user_id);

-- Add trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_categorization_rules_updated_at
    BEFORE UPDATE ON user_categorization_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE user_categorization_rules IS 'Stores custom categorization rules created by users when they manually categorize transactions';
COMMENT ON COLUMN user_categorization_rules.match_type IS 'Type of matching: contains, fuzzy, regex, or exact';
COMMENT ON COLUMN user_categorization_rules.keyword IS 'The keyword or pattern to match against transaction descriptions';
COMMENT ON COLUMN user_categorization_rules.category_code IS 'The account code to assign when this rule matches';
COMMENT ON COLUMN user_categorization_rules.usage_count IS 'Number of times this rule has been applied to transactions';
COMMENT ON COLUMN user_categorization_rules.is_active IS 'Whether this rule is currently active and should be applied'; 