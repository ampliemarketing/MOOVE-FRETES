// ============================================================================
// HELPER: Funções auxiliares para trabalhar com a nova estrutura consolidada
// ============================================================================
// Este arquivo fornece utilidades para trabalhar com a estrutura unificada
// após a migração de consolidação do banco de dados.
// ============================================================================

import { getSupabaseClient } from './supabase/client';

// ============================================================================
// TIPOS ATUALIZADOS
// ============================================================================

export interface UnifiedUser {
  // Dados de profiles
  id: string;
  email: string;
  name: string;
  phone?: string;
  cpf?: string;
  cnpj?: string;
  user_type: 'caminhoneiro' | 'transportadora' | 'embarcador' | 'agenciador';
  avatar_url?: string;
  bio?: string;
  rating: number;
  total_freights: number;
  completed_freights: number;
  verification_status: 'pending' | 'verified' | 'rejected';
  is_active: boolean;
  email_verified: boolean;
  city?: string;
  state?: string;
  is_online: boolean;
  last_seen?: string;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
  metadata?: Record<string, any>;
  
  // Dados de company (se aplicável)
  trading_name?: string;
  razao_social?: string;
  company_type?: 'transportadora' | 'embarcador' | 'ambos';
  corporate_email?: string;
  company_address?: Address;
  representative_name?: string;
  representative_phone?: string;
  representative_email?: string;
  fleet_size?: number;
  operating_states?: string[];
  
  // Dados de driver (se aplicável)
  cnh?: string;
  cnh_category?: string;
  cnh_expiry?: string;
  experience_years?: number;
  driver_available?: boolean;
  driver_address?: Address;
  vehicle_plate?: string;
  vehicle_model?: string;
  driver_vehicle_type?: string;
  preferred_routes?: any[];
  
  // Endereço unificado (prioridade: company > driver)
  full_address?: Address;
}

export interface Address {
  cep?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
}

export interface Profile {
  id: string;
  email: string;
  name: string;
  phone?: string;
  cpf?: string;
  cnpj?: string;
  user_type: 'caminhoneiro' | 'transportadora' | 'embarcador' | 'agenciador';
  avatar_url?: string;
  bio?: string;
  rating: number;
  total_freights: number;
  completed_freights: number;
  verification_status: 'pending' | 'verified' | 'rejected';
  is_active: boolean;
  email_verified: boolean;
  city?: string;
  state?: string;
  is_online: boolean;
  last_seen?: string;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
  metadata?: Record<string, any>;
}

export interface Company {
  id: string;
  user_id: string;
  company_name: string;
  cnpj: string;
  trading_name?: string;
  company_type: 'transportadora' | 'embarcador' | 'ambos';
  state_registration?: string;
  municipal_registration?: string;
  phone?: string;
  website?: string;
  description?: string;
  address?: Address; // ✅ AGORA É JSONB
  corporate_email?: string; // ✅ Email único
  representative_name?: string;
  representative_cpf?: string;
  representative_rg?: string;
  representative_phone?: string;
  representative_email?: string;
  representative_role?: string;
  representative_cnh?: string;
  rntrc?: string;
  rntrc_expiry?: string;
  fleet_size?: number;
  operating_states?: string[];
  created_at: string;
  updated_at: string;
}

export interface Driver {
  id: string;
  user_id: string;
  name?: string;
  cpf?: string;
  rg?: string;
  birth_date?: string;
  phone?: string;
  cnh: string;
  cnh_category: string;
  cnh_expiry?: string;
  experience_years?: number;
  available: boolean;
  address?: Address; // ✅ AGORA É JSONB
  vehicle_plate?: string;
  vehicle_model?: string;
  vehicle_type?: string;
  vehicle_year?: string;
  renavam?: string;
  antt_vehicle?: string;
  rntrc?: string;
  rntrc_expiry?: string;
  rating: number;
  completed_trips: number;
  preferred_routes?: any[];
  created_at: string;
  updated_at: string;
}

// ============================================================================
// FUNÇÕES DE ACESSO A DADOS (Database Layer)
// ============================================================================

export const database = {
  
  // ✅ PROFILES (substitui "users")
  profiles: {
    async getAll() {
      const supabase = getSupabaseClient();
      return await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
    },
    
    async getById(id: string) {
      const supabase = getSupabaseClient();
      return await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();
    },
    
    async getByEmail(email: string) {
      const supabase = getSupabaseClient();
      return await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .single();
    },
    
    async update(id: string, data: Partial<Profile>) {
      const supabase = getSupabaseClient();
      return await supabase
        .from('profiles')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
    },
    
    async getOnlineUsers() {
      const supabase = getSupabaseClient();
      return await supabase
        .from('profiles')
        .select('*')
        .eq('is_online', true);
    },
    
    async updateOnlineStatus(id: string, isOnline: boolean) {
      const supabase = getSupabaseClient();
      return await supabase
        .from('profiles')
        .update({
          is_online: isOnline,
          last_seen: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
    }
  },
  
  // ✅ UNIFIED USERS (view que junta profiles + companies + drivers)
  unifiedUsers: {
    async getAll() {
      const supabase = getSupabaseClient();
      return await supabase
        .from('unified_users')
        .select('*')
        .order('created_at', { ascending: false });
    },
    
    async getById(id: string): Promise<UnifiedUser | null> {
      console.log('🔍 [UnifiedUsers.getById] Buscando usuário:', id);
      
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('unified_users')
        .select('*')
        .eq('id', id)
        .maybeSingle(); // ✅ Usa maybeSingle() ao invés de single() para evitar erro PGRST116
      
      if (error) {
        console.error('❌ [UnifiedUsers.getById] Erro ao buscar usuário:', id, error);
        return null;
      }
      
      // ✅ Se não encontrou nada, retorna null silenciosamente
      if (!data) {
        return null;
      }
      
      console.log('✅ [UnifiedUsers.getById] Usuário encontrado:', {
        id: data.id,
        name: data.name,
        userType: data.user_type
      });
      
      return data as UnifiedUser;
    },
    
    async getByType(userType: string) {
      const supabase = getSupabaseClient();
      return await supabase
        .from('unified_users')
        .select('*')
        .eq('user_type', userType);
    },
    
    async search(query: string) {
      const supabase = getSupabaseClient();
      return await supabase
        .from('unified_users')
        .select('*')
        .or(`name.ilike.%${query}%,email.ilike.%${query}%,trading_name.ilike.%${query}%`);
    }
  },
  
  // ✅ COMPANIES (com endereço em JSONB)
  companies: {
    async getByUserId(userId: string) {
      const supabase = getSupabaseClient();
      return await supabase
        .from('companies')
        .select('*')
        .eq('user_id', userId)
        .single();
    },
    
    async update(id: string, data: Partial<Company>) {
      const supabase = getSupabaseClient();
      return await supabase
        .from('companies')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
    },
    
    // ✅ Buscar por cidade (usando JSONB)
    async getByCity(city: string) {
      const supabase = getSupabaseClient();
      return await supabase
        .from('companies')
        .select('*')
        .filter('address->>city', 'eq', city);
    },
    
    // ✅ Buscar por estado (usando JSONB)
    async getByState(state: string) {
      const supabase = getSupabaseClient();
      return await supabase
        .from('companies')
        .select('*')
        .filter('address->>state', 'eq', state);
    }
  },
  
  // ✅ DRIVERS (com endereço em JSONB)
  drivers: {
    async getByUserId(userId: string) {
      const supabase = getSupabaseClient();
      return await supabase
        .from('drivers')
        .select('*')
        .eq('user_id', userId)
        .single();
    },
    
    async update(id: string, data: Partial<Driver>) {
      const supabase = getSupabaseClient();
      return await supabase
        .from('drivers')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
    },
    
    async getAvailable() {
      const supabase = getSupabaseClient();
      return await supabase
        .from('drivers')
        .select('*')
        .eq('available', true);
    },
    
    // ✅ Buscar por cidade (usando JSONB)
    async getByCity(city: string) {
      const supabase = getSupabaseClient();
      return await supabase
        .from('drivers')
        .select('*')
        .filter('address->>city', 'eq', city);
    },
    
    // ✅ Buscar por estado (usando JSONB)
    async getByState(state: string) {
      const supabase = getSupabaseClient();
      return await supabase
        .from('drivers')
        .select('*')
        .filter('address->>state', 'eq', state);
    }
  }
};

// Import repositories para acesso conveniente
import { ratingRepository } from './database/repositories/rating-repository';
import { preferredRouteRepository } from './database/repositories/preferred-route-repository-v2';
import { favoriteRepository } from './database/repositories/favorite-repository';

// Adicionar aos helpers do database
(database as any).ratings = ratingRepository;
(database as any).preferredRoutes = preferredRouteRepository;
(database as any).favorites = favoriteRepository;

// ============================================================================
// FUNÇÕES AUXILIARES PARA TRABALHAR COM ENDEREÇOS
// ============================================================================

export const addressHelpers = {
  /**
   * Formata um endereço JSONB para string legível
   */
  formatAddress(address?: Address): string {
    if (!address) return 'Endereço não informado';
    
    const parts = [
      address.street,
      address.number,
      address.complement,
      address.neighborhood,
      address.city,
      address.state,
      address.cep
    ].filter(Boolean);
    
    return parts.join(', ');
  },
  
  /**
   * Extrai cidade e estado de um endereço
   */
  getCityState(address?: Address): string {
    if (!address?.city && !address?.state) return '';
    return [address.city, address.state].filter(Boolean).join(', ');
  },
  
  /**
   * Valida se um endereço está completo
   */
  isComplete(address?: Address): boolean {
    if (!address) return false;
    return !!(
      address.cep &&
      address.street &&
      address.number &&
      address.city &&
      address.state
    );
  },
  
  /**
   * Converte campos separados para objeto Address (migração)
   */
  fromSeparateFields(fields: {
    cep?: string;
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
  }): Address {
    return {
      cep: fields.cep,
      street: fields.street,
      number: fields.number,
      complement: fields.complement,
      neighborhood: fields.neighborhood,
      city: fields.city,
      state: fields.state
    };
  }
};

// ============================================================================
// FUNÇÕES AUXILIARES PARA TRABALHAR COM USUÁRIOS UNIFICADOS
// ============================================================================

export const userHelpers = {
  /**
   * Obtém o nome de exibição do usuário (prioriza trading_name se for empresa)
   */
  getDisplayName(user: UnifiedUser | Profile): string {
    if ('trading_name' in user && user.trading_name) {
      return user.trading_name;
    }
    return user.name || user.email.split('@')[0];
  },
  
  /**
   * Obtém o endereço principal do usuário (prioriza company > driver)
   */
  getPrimaryAddress(user: UnifiedUser): Address | undefined {
    return user.full_address || user.company_address || user.driver_address;
  },
  
  /**
   * Verifica se o usuário é uma empresa
   */
  isCompany(user: UnifiedUser | Profile): boolean {
    return ['transportadora', 'embarcador', 'agenciador'].includes(user.user_type);
  },
  
  /**
   * Verifica se o usuário é motorista
   */
  isDriver(user: UnifiedUser | Profile): boolean {
    return user.user_type === 'caminhoneiro';
  },
  
  /**
   * Obtém o email principal (prioriza corporate_email se for empresa)
   */
  getPrimaryEmail(user: UnifiedUser): string {
    if ('corporate_email' in user && user.corporate_email) {
      return user.corporate_email;
    }
    return user.email;
  },
  
  /**
   * Obtém documento (CPF ou CNPJ)
   */
  getDocument(user: UnifiedUser | Profile): string | undefined {
    return user.cnpj || user.cpf;
  },
  
  /**
   * Formata documento (CPF ou CNPJ)
   */
  formatDocument(user: UnifiedUser | Profile): string {
    const doc = this.getDocument(user);
    if (!doc) return 'Não informado';
    
    if (doc.length === 11) {
      // CPF: 000.000.000-00
      return doc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else if (doc.length === 14) {
      // CNPJ: 00.000.000/0000-00
      return doc.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    
    return doc;
  }
};

// ============================================================================
// HOOK PARA REACT (compatibilidade)
// ============================================================================

/**
 * Hook para usar dados de usuário unificados no React
 * @example
 * const { user, loading, error, refresh } = useUnifiedUser(userId);
 */
export function useUnifiedUser(userId?: string) {
  const [user, setUser] = React.useState<UnifiedUser | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);
  
  const refresh = React.useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const data = await database.unifiedUsers.getById(userId);
      setUser(data);
      setError(null);
    } catch (err) {
      setError(err as Error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);
  
  React.useEffect(() => {
    refresh();
  }, [refresh]);
  
  return { user, loading, error, refresh };
}

// Para compatibilidade, importar React apenas se disponível
let React: any;
try {
  React = require('react');
} catch {
  // React não disponível (contexto não-React)
}

// ============================================================================
// EXEMPLO DE USO
// ============================================================================

/*
// 1. Buscar usuário completo (profiles + companies + drivers)
const user = await database.unifiedUsers.getById(userId);
console.log('Nome:', userHelpers.getDisplayName(user));
console.log('Email:', userHelpers.getPrimaryEmail(user));
console.log('Endereço:', addressHelpers.formatAddress(user.full_address));

// 2. Atualizar profile
await database.profiles.update(userId, {
  name: 'Novo Nome',
  city: 'São Paulo',
  state: 'SP'
});

// 3. Atualizar endereço de empresa
await database.companies.update(companyId, {
  address: {
    cep: '01310-100',
    street: 'Avenida Paulista',
    number: '1000',
    city: 'São Paulo',
    state: 'SP'
  }
});

// 4. Buscar empresas em São Paulo
const companies = await database.companies.getByCity('São Paulo');

// 5. Usar no React
function MyComponent({ userId }) {
  const { user, loading, error } = useUnifiedUser(userId);
  
  if (loading) return <div>Carregando...</div>;
  if (error) return <div>Erro: {error.message}</div>;
  
  return (
    <div>
      <h1>{userHelpers.getDisplayName(user)}</h1>
      <p>{addressHelpers.getCityState(user.full_address)}</p>
    </div>
  );
}
*/