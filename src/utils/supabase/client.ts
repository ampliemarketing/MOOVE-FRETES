/**
 * Supabase Client Singleton
 * Single instance to avoid multiple GoTrueClient warnings
 */

import { createClient } from '@supabase/supabase-js';
import { supabaseUrl, publicAnonKey } from './info';

// Create a single instance using global storage to persist across hot reloads
const globalForSupabase = globalThis as unknown as {
  supabaseInstance?: ReturnType<typeof createClient>;
  supabaseInstanceCreated?: boolean;
};

export function getSupabaseClient() {
  if (!globalForSupabase.supabaseInstance) {
    if (!globalForSupabase.supabaseInstanceCreated) {
      globalForSupabase.supabaseInstanceCreated = true;
    }
    
    globalForSupabase.supabaseInstance = createClient(supabaseUrl, publicAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        // Mesma storageKey usada no app mobile (src/lib/supabase.ts) — não é
        // estritamente necessário que bata (localStorage do browser e
        // AsyncStorage do app nunca se veem), mas evita confusão ao debugar
        // os dois lados do mesmo banco lado a lado.
        storageKey: 'moovefretes-auth-token',
      },
      global: {
        headers: {
          'X-Client-Info': 'moovefretes-web',
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