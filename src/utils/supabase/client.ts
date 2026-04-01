/**
 * Supabase Client Singleton
 * Single instance to avoid multiple GoTrueClient warnings
 */

import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './info';

const supabaseUrl = `https://${projectId}.supabase.co`;

// Create a single instance using global storage to persist across hot reloads
const globalForSupabase = globalThis as unknown as {
  supabaseInstance?: ReturnType<typeof createClient>;
  supabaseInstanceCreated?: boolean;
};

export function getSupabaseClient() {
  if (!globalForSupabase.supabaseInstance) {
    if (!globalForSupabase.supabaseInstanceCreated) {
      console.log('🔧 Creating Supabase client singleton instance');
      globalForSupabase.supabaseInstanceCreated = true;
    }
    
    globalForSupabase.supabaseInstance = createClient(supabaseUrl, publicAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        storageKey: 'maisfrete-auth-token', // Unique key to avoid conflicts
      },
      global: {
        headers: {
          'X-Client-Info': 'maisfrete-web',
        },
      },
      db: {
        schema: 'public',
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  }
  return globalForSupabase.supabaseInstance;
}

// Export singleton instance
export const supabase = getSupabaseClient();

// Export URL and key for API calls
export { supabaseUrl, publicAnonKey };

/**
 * Helper function to check if Supabase is accessible
 */
export async function testSupabaseConnection(): Promise<boolean> {
  try {
    const { error } = await supabase.from('profiles').select('count').limit(1);
    return !error;
  } catch (error) {
    console.error('❌ Supabase connection test failed:', error);
    return false;
  }
}