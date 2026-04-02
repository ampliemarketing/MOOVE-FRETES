/* Credenciais migradas para variáveis de ambiente — não adicionar valores hardcoded aqui */

export const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID as string;
export const publicAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;