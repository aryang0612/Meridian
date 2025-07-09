import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Singleton instance
let supabaseInstance: SupabaseClient | null = null;
let supabaseEnabled = false;

export function getSupabaseClient(): SupabaseClient | null {
  // Return existing instance if available
  if (supabaseInstance) {
    return supabaseInstance;
  }

  // Try both server and client env vars
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  // Check if we have the required environment variables
  if (!supabaseUrl || !supabaseAnonKey) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ Supabase credentials not found - running in offline mode');
    }
    return null;
  }

  // Validate URL format
  if (!supabaseUrl.startsWith('https://')) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ Invalid Supabase URL format - running in offline mode');
    }
    return null;
  }

  // Validate anon key format (should be a JWT token starting with "eyJ")
  if (!supabaseAnonKey.startsWith('eyJ')) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ Invalid Supabase anon key format - running in offline mode');
    }
    return null;
  }

  try {
    // Create Supabase client
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    });

    supabaseEnabled = true;
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Supabase client initialized successfully');
    }
    return supabaseInstance;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ Failed to initialize Supabase client - running in offline mode');
    }
    return null;
  }
}

export function isSupabaseEnabled(): boolean {
  return supabaseEnabled;
}

export async function getCurrentUser() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return null;
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      console.error('Error getting current user:', error);
      return null;
    }
    return user;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

// Type definitions for the database
export interface LearnedPattern {
  id: string;
  user_id: string;
  organization_id?: string;
  pattern: string;
  category_code: string;
  confidence: number;
  usage_count: number;
  last_used: string;
  created_at: string;
  updated_at: string;
}

export interface UserCorrection {
  id: string;
  user_id: string;
  organization_id?: string;
  original_description: string;
  corrected_category_code: string;
  created_at: string;
}

// Database operation helpers with proper error handling
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      console.warn('⚠️ Supabase not available - cannot test database connection');
      return false;
    }
    
    const { data, error } = await supabase.from('learned_patterns').select('count').limit(1);
    
    if (error) {
      console.error('❌ Database connection test failed:', error.message);
      return false;
    }
    
    // Database connection test successful
    return true;
  } catch (error) {
    console.error('❌ Database connection test error:', error);
    return false;
  }
} 