/**
 * Supabase Configuration
 * Centralized configuration for Supabase connection
 */

// Supabase Project Configuration — credenciais via variáveis de ambiente
export const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID as string;
export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
export const publicAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !publicAnonKey || !projectId) {
  throw new Error('Variáveis de ambiente VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY e VITE_SUPABASE_PROJECT_ID são obrigatórias.');
}
