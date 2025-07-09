import { getSupabaseClient, getCurrentUser, LearnedPattern, UserCorrection, isSupabaseEnabled } from './supabase';

export class DatabaseService {
  private static instance: DatabaseService;
  private fallbackData: {
    learnedPatterns: LearnedPattern[];
    userCorrections: UserCorrection[];
  } = {
    learnedPatterns: [],
    userCorrections: []
  };

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  private constructor() {
    // Initialize fallback data from localStorage if available
    this.loadFallbackData();
  }

  private loadFallbackData() {
    try {
      if (typeof window !== 'undefined') {
        const savedPatterns = localStorage.getItem('meridian_learned_patterns');
        const savedCorrections = localStorage.getItem('meridian_user_corrections');
        
        if (savedPatterns) {
          this.fallbackData.learnedPatterns = JSON.parse(savedPatterns);
        }
        
        if (savedCorrections) {
          this.fallbackData.userCorrections = JSON.parse(savedCorrections);
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to load fallback data from localStorage:', error);
    }
  }

  private saveFallbackData() {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('meridian_learned_patterns', JSON.stringify(this.fallbackData.learnedPatterns));
        localStorage.setItem('meridian_user_corrections', JSON.stringify(this.fallbackData.userCorrections));
      }
    } catch (error) {
      console.warn('⚠️ Failed to save fallback data to localStorage:', error);
    }
  }

  async saveLearnedPattern(pattern: string, categoryCode: string, confidence: number = 85): Promise<void> {
    try {
      const supabase = getSupabaseClient();
      
      if (!supabase || !isSupabaseEnabled()) {
        console.warn('⚠️ Supabase not available, saving pattern to localStorage');
        
        // Save to fallback storage
        const newPattern: LearnedPattern = {
          id: `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          user_id: 'fallback_user', // Fallback user ID when Supabase is not available
          pattern,
          category_code: categoryCode,
          confidence,
          usage_count: 1,
          last_used: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        this.fallbackData.learnedPatterns.push(newPattern);
        this.saveFallbackData();
        return;
      }

      const user = await getCurrentUser();
      
      const { error } = await supabase
        .from('learned_patterns')
        .upsert({
          user_id: user?.id,
          pattern,
          category_code: categoryCode,
          confidence,
          usage_count: 1,
          last_used: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error saving learned pattern:', error);
        throw error;
      }

      console.log('✅ Learned pattern saved successfully');
    } catch (error) {
      console.error('❌ Failed to save learned pattern:', error);
      
      // Fallback to localStorage
      console.warn('⚠️ Falling back to localStorage for pattern storage');
      const newPattern: LearnedPattern = {
        id: `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        user_id: 'fallback_user', // Fallback user ID when Supabase is not available
        pattern,
        category_code: categoryCode,
        confidence,
        usage_count: 1,
        last_used: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      this.fallbackData.learnedPatterns.push(newPattern);
      this.saveFallbackData();
    }
  }

  async getLearnedPatterns(): Promise<LearnedPattern[]> {
    try {
      const supabase = getSupabaseClient();
      
      if (!supabase || !isSupabaseEnabled()) {
        console.warn('⚠️ Supabase not available, returning patterns from localStorage');
        return this.fallbackData.learnedPatterns;
      }

      const user = await getCurrentUser();
      
      const { data, error } = await supabase
        .from('learned_patterns')
        .select('*')
        .eq('user_id', user?.id)
        .order('last_used', { ascending: false });

      if (error) {
        console.error('Error fetching learned patterns:', error);
        console.warn('⚠️ Falling back to localStorage patterns');
        return this.fallbackData.learnedPatterns;
      }

      return data || [];
    } catch (error) {
      console.error('❌ Failed to fetch learned patterns:', error);
      console.warn('⚠️ Falling back to localStorage patterns');
      return this.fallbackData.learnedPatterns;
    }
  }

  async recordUserCorrection(originalDescription: string, correctedCategoryCode: string): Promise<void> {
    try {
      const supabase = getSupabaseClient();
      
      if (!supabase || !isSupabaseEnabled()) {
        console.warn('⚠️ Supabase not available, saving correction to localStorage');
        
        // Save to fallback storage
        const newCorrection: UserCorrection = {
          id: `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          user_id: 'fallback_user', // Fallback user ID when Supabase is not available
          original_description: originalDescription,
          corrected_category_code: correctedCategoryCode,
          created_at: new Date().toISOString()
        };
        
        this.fallbackData.userCorrections.push(newCorrection);
        this.saveFallbackData();
        return;
      }

      const user = await getCurrentUser();
      
      const { error } = await supabase
        .from('user_corrections')
        .insert({
          user_id: user?.id,
          original_description: originalDescription,
          corrected_category_code: correctedCategoryCode
        });

      if (error) {
        console.error('Error recording user correction:', error);
        throw error;
      }

      console.log('✅ User correction recorded successfully');
    } catch (error) {
      console.error('❌ Failed to record user correction:', error);
      
      // Fallback to localStorage
      console.warn('⚠️ Falling back to localStorage for correction storage');
      const newCorrection: UserCorrection = {
        id: `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        user_id: 'fallback_user', // Fallback user ID when Supabase is not available
        original_description: originalDescription,
        corrected_category_code: correctedCategoryCode,
        created_at: new Date().toISOString()
      };
      
      this.fallbackData.userCorrections.push(newCorrection);
      this.saveFallbackData();
    }
  }

  async getUserCorrections(): Promise<UserCorrection[]> {
    try {
      const supabase = getSupabaseClient();
      
      if (!supabase || !isSupabaseEnabled()) {
        console.warn('⚠️ Supabase not available, returning corrections from localStorage');
        return this.fallbackData.userCorrections;
      }

      const user = await getCurrentUser();
      
      const { data, error } = await supabase
        .from('user_corrections')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user corrections:', error);
        console.warn('⚠️ Falling back to localStorage corrections');
        return this.fallbackData.userCorrections;
      }

      return data || [];
    } catch (error) {
      console.error('❌ Failed to fetch user corrections:', error);
      console.warn('⚠️ Falling back to localStorage corrections');
      return this.fallbackData.userCorrections;
    }
  }

  async updatePatternUsage(pattern: string): Promise<void> {
    try {
      const supabase = getSupabaseClient();
      
      if (!supabase || !isSupabaseEnabled()) {
        console.warn('⚠️ Supabase not available, updating pattern usage in localStorage');
        
        // Update in fallback storage
        const existingPattern = this.fallbackData.learnedPatterns.find(p => p.pattern === pattern);
        if (existingPattern) {
          existingPattern.usage_count += 1;
          existingPattern.last_used = new Date().toISOString();
          existingPattern.updated_at = new Date().toISOString();
          this.saveFallbackData();
        }
        return;
      }

      const user = await getCurrentUser();
      
      // First get the current usage count, then increment
      const { data: currentPattern, error: fetchError } = await supabase
        .from('learned_patterns')
        .select('usage_count')
        .eq('pattern', pattern)
        .eq('user_id', user?.id)
        .single();

      if (fetchError) {
        console.error('Error fetching current pattern:', fetchError);
        return;
      }

      const { error } = await supabase
        .from('learned_patterns')
        .update({
          usage_count: (currentPattern?.usage_count || 0) + 1,
          last_used: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('pattern', pattern)
        .eq('user_id', user?.id);

      if (error) {
        console.error('Error updating pattern usage:', error);
        // Don't throw here, it's not critical
      }
    } catch (error) {
      console.error('❌ Failed to update pattern usage:', error);
      // Don't throw here, it's not critical
    }
  }

  async clearAllData(): Promise<void> {
    try {
      const supabase = getSupabaseClient();
      
      if (!supabase || !isSupabaseEnabled()) {
        console.warn('⚠️ Supabase not available, clearing localStorage data');
        
        // Clear fallback storage
        this.fallbackData.learnedPatterns = [];
        this.fallbackData.userCorrections = [];
        this.saveFallbackData();
        return;
      }

      const user = await getCurrentUser();
      
      // Clear learned patterns
      const { error: patternsError } = await supabase
        .from('learned_patterns')
        .delete()
        .eq('user_id', user?.id);

      if (patternsError) {
        console.error('Error clearing learned patterns:', patternsError);
      }

      // Clear user corrections
      const { error: correctionsError } = await supabase
        .from('user_corrections')
        .delete()
        .eq('user_id', user?.id);

      if (correctionsError) {
        console.error('Error clearing user corrections:', correctionsError);
      }

      console.log('✅ All user data cleared successfully');
    } catch (error) {
      console.error('❌ Failed to clear user data:', error);
      throw error;
    }
  }
} 