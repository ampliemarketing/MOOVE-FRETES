/**
 * Supabase Sync - Preferred Routes
 * Funções para sincronização de rotas preferidas com Supabase
 */

import { getSupabaseClient } from './supabase/client';
import { database } from './database';
import type { PreferredRoute } from './database/schema';
import type { DBResponse } from './database/db-client';

/**
 * Sincronizar empresa com Supabase
 */
export async function syncCompanyToSupabase(company: any): Promise<{ success: boolean; error?: string }> {
  try {
    
    const supabase = getSupabaseClient();
    
    // ⚠️ IMPORTANTE: Não enviar company.id customizado (cmp_xxx) - Supabase usa UUID do Auth
    // Usar apenas user_id que já é um UUID válido do Supabase Auth
    const companyData = {
      user_id: company.userId, // UUID do Supabase Auth
      company_name: company.companyName,
      cnpj: company.cnpj,
      trading_name: company.tradingName || null,
      company_type: company.companyType,
      state_registration: company.stateRegistration || null,
      municipal_registration: company.municipalRegistration || null,
      phone: company.phone || null,
      website: company.website || null,
      description: company.description || null,
      address: company.address || {},
      certifications: company.certifications || [],
      fleet_size: company.fleetSize || 0,
      operating_states: company.operatingStates || [],
      representative_name: company.representativeName || null,
      representative_cpf: company.representativeCpf || null,
      representative_rg: company.representativeRg || null,
      representative_phone: company.representativePhone || null,
      representative_email: company.representativeEmail || null,
      representative_role: company.representativeRole || null,
      representative_cnh: company.representativeCnh || null,
      rntrc: company.rntrc || null,
      rntrc_expiry: company.rntrcExpiry || null,
      is_individual: company.isIndividual || false,
      main_cpf: company.mainCpf || null,
      corporate_email: company.corporateEmail || null,
      created_at: company.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Tentar inserir ou atualizar (upsert)
    // A tabela companies usa user_id como PRIMARY KEY, então não precisa de 'id' separado
    
    // ✅ Primeiro, verificar se já existe uma empresa com este user_id
    const { data: existingCompany } = await supabase
      .from('companies')
      .select('user_id, cnpj')
      .eq('user_id', companyData.user_id)
      .maybeSingle();
    
    let data, error;
    
    if (existingCompany) {
      // ✅ Atualizar empresa existente (UPDATE)
      const result = await supabase
        .from('companies')
        .update(companyData)
        .eq('user_id', companyData.user_id)
        .select()
        .single();
      
      data = result.data;
      error = result.error;
    } else {
      // ✅ Criar nova empresa (INSERT)
      
      // Verificar se CNPJ já existe em outra empresa
      if (companyData.cnpj) {
        const { data: cnpjExists } = await supabase
          .from('companies')
          .select('user_id, cnpj')
          .eq('cnpj', companyData.cnpj)
          .maybeSingle();
        
        if (cnpjExists) {
          return {
            success: false,
            error: 'CNPJ já cadastrado no sistema'
          };
        }
      }
      
      const result = await supabase
        .from('companies')
        .insert(companyData)
        .select()
        .single();
      
      data = result.data;
      error = result.error;
    }
    
    if (error) {
      console.error('❌ Erro ao sincronizar empresa com Supabase:', error);
      
      // ✅ Mensagem mais amigável para erro de CNPJ duplicado
      if (error.code === '23505' && error.message.includes('companies_cnpj_key')) {
        return {
          success: false,
          error: 'CNPJ já cadastrado no sistema'
        };
      }
      
      return {
        success: false,
        error: error.message
      };
    }
    
    return { success: true };
  } catch (error) {
    console.error('❌ Erro ao sincronizar empresa:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido ao sincronizar empresa'
    };
  }
}

/**
 * Carregar rotas ativas do Supabase
 */
export async function loadActiveRoutesFromSupabase(): Promise<PreferredRoute[]> {
  try {
    
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('preferred_routes')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Erro ao carregar rotas do Supabase:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Mapear dados do Supabase para formato local
    const routes: PreferredRoute[] = data.map(row => ({
      id: row.id,
      driverId: row.driver_id,
      origin: row.origin,
      destination: row.destination,
      priority: row.priority as 'high' | 'medium' | 'low',
      notes: row.notes || '',
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return routes;
  } catch (error) {
    console.error('❌ Erro ao carregar rotas do Supabase:', error);
    return [];
  }
}

/**
 * Criar rota preferida e sincronizar com Supabase
 */
export async function createPreferredRouteAndSync(
  data: Partial<PreferredRoute> & { driverId: string }
): Promise<DBResponse<PreferredRoute>> {
  try {
    
    // Criar no database local (que já sincroniza com Supabase)
    const result = await database.preferredRoutes.create({
      driverId: data.driverId,
      origin: data.origin || { city: '', state: '' },
      destination: data.destination || { city: '', state: '' },
      priority: data.priority || 'medium',
      notes: data.notes || '',
      isActive: data.isActive !== undefined ? data.isActive : true,
    });

    return result;
  } catch (error) {
    console.error('❌ Erro ao criar rota:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao criar rota',
    };
  }
}

/**
 * Atualizar rota preferida e sincronizar com Supabase
 */
export async function updatePreferredRouteAndSync(
  routeId: string,
  updates: Partial<PreferredRoute>
): Promise<DBResponse<PreferredRoute>> {
  try {
    
    // Atualizar no database local (que já sincroniza com Supabase)
    const result = await database.preferredRoutes.update(routeId, updates);

    return result;
  } catch (error) {
    console.error('❌ Erro ao atualizar rota:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao atualizar rota',
    };
  }
}

function mapRealtimeRowToRoute(row: any): PreferredRoute {
  return {
    id: row.id,
    driverId: row.driver_id,
    origin: row.origin,
    destination: row.destination,
    priority: row.priority as 'high' | 'medium' | 'low',
    notes: row.notes || '',
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  } as PreferredRoute;
}

/**
 * Subscrever em tempo real a mudanças em rotas no Supabase.
 *
 * É `async` porque precisa garantir que o socket de Realtime esteja
 * autenticado ANTES de assinar — o RLS de `postgres_changes` roda com o
 * papel do JWT, e a policy de preferred_routes é `to authenticated`, então
 * sem token nenhum evento é entregue.
 */
export async function subscribeToRoutesRealtime(callbacks: {
  onRoutePublished?: (route: PreferredRoute) => void;
  onRouteUpdated?: (route: PreferredRoute) => void;
  onRouteDeleted?: (routeId: string) => void;
}): Promise<any> {
  try {
    const supabase = getSupabaseClient();

    // 1. Autenticar o socket de realtime (idempotente)
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        (supabase as any).realtime?.setAuth(session.access_token);
      }
    } catch (e) {
      console.warn('⚠️ Não foi possível autenticar o realtime:', e);
    }

    // 2. Nome de canal ÚNICO por assinatura — evita colisão/dedupe quando
    //    mais de uma tela (ou o StrictMode em dev) assina ao mesmo tempo.
    const channelName = `preferred_routes_changes_${Math.random().toString(36).slice(2)}_${Date.now()}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'preferred_routes' },
        (payload: any) => {
          try {
            if (payload.eventType === 'INSERT') {
              callbacks.onRoutePublished?.(mapRealtimeRowToRoute(payload.new));
            } else if (payload.eventType === 'UPDATE') {
              callbacks.onRouteUpdated?.(mapRealtimeRowToRoute(payload.new));
            } else if (payload.eventType === 'DELETE') {
              const id = payload.old?.id;
              if (id) callbacks.onRouteDeleted?.(id);
            }
          } catch (err) {
            console.error('❌ Erro ao processar evento realtime de rota:', err);
          }
        }
      )
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          console.info('✅ Realtime de rotas preferidas conectado.');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn(`⚠️ Realtime de rotas preferidas: ${status}. ` +
            'Verifique se a tabela preferred_routes está na publicação supabase_realtime.');
        }
      });

    return channel;
  } catch (error) {
    console.error('❌ Erro ao configurar subscription:', error);
    return null;
  }
}

/**
 * Cancelar subscription em tempo real
 */
export function unsubscribeFromRealtime(channel?: any): void {
  try {
    if (!channel) return;
    const supabase = getSupabaseClient();
    supabase.removeChannel(channel);
  } catch (e) {
    console.warn('⚠️ Erro ao remover canal realtime:', e);
  }
}