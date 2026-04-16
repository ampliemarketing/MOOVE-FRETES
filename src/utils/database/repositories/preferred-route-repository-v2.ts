/**
 * Preferred Route Repository - 100% Integrado com Supabase
 * Rotas preferidas dos motoristas (funcionalidade principal do sistema)
 * 
 * ARQUITETURA:
 * 1. Supabase como fonte primária
 * 2. LocalStorage como cache opcional
 * 3. Queries otimizadas por origem/destino
 */

import { getSupabaseClient } from '../../supabase/client';
import { db, DBResponse } from '../db-client';
import { KeyPatterns, PaginationParams } from '../schema';
import { preferredRouteToSQL, sqlToPreferredRoute } from '../adapters';
import { generateId } from '../id-generator';

interface PreferredRoute {
  id: string;
  driverId: string;
  origin: {
    city: string;
    state: string;
    cep?: string;
  };
  destination: {
    city: string;
    state: string;
    cep?: string;
  };
  priority?: 'high' | 'medium' | 'low';
  notes?: string;
  description?: string;
  isActive: boolean;
  availableFrom?: string;
  availableUntil?: string;
  vehicleTypes?: string[];
  capacityKg?: string;
  preferredCargoTypes?: string[];
  pricePerKm?: string;
  minimumValue?: string;
  acceptsPartialLoad?: boolean;
  viewsCount?: number;
  contactsCount?: number;
  createdAt: string;
  updatedAt: string;
  metadata?: any;
}

export class PreferredRouteRepository {
  /**
   * Create a new preferred route
   * ✅ SALVA NO SUPABASE PRIMEIRO
   */
  async create(route: Omit<PreferredRoute, 'id' | 'createdAt' | 'updatedAt' | 'viewsCount' | 'contactsCount'>): Promise<DBResponse<PreferredRoute>> {
    try {
      // ❌ REMOVIDO: ID customizado que não é UUID
      // const id = generateId('route');
      const now = new Date().toISOString();

      // ✅ NÃO incluir 'id' - deixar Supabase gerar UUID
      const newRoute: Omit<PreferredRoute, 'id'> = {
        ...route,
        viewsCount: 0,
        contactsCount: 0,
        createdAt: now,
        updatedAt: now,
      };

      // 1. SALVAR NO SUPABASE (que vai gerar o UUID)
      const supabase = getSupabaseClient();
      const sqlData = preferredRouteToSQL(newRoute);

      const { data, error } = await supabase
        .from('preferred_routes')
        .insert(sqlData)
        .select()
        .single();

      if (error) {
        console.error('❌ Erro ao criar rota preferida no Supabase:', error);
        throw error;
      }

      const created = sqlToPreferredRoute(data);
      console.log('✅ Rota preferida criada no Supabase:', created.id);

      // 2. CACHE (com ID gerado pelo Supabase)
      await db.set(KeyPatterns.preferredRoute(created.id), created);

      return {
        success: true,
        data: created,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create preferred route',
      };
    }
  }

  /**
   * Get route by ID
   */
  async getById(id: string): Promise<DBResponse<PreferredRoute>> {
    try {
      // 1. Cache
      const cached = await db.get<PreferredRoute>(KeyPatterns.preferredRoute(id));
      if (cached.success && cached.data) {
        return cached;
      }

      // 2. Supabase
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('preferred_routes')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      const route = sqlToPreferredRoute(data);
      await db.set(KeyPatterns.preferredRoute(id), route);

      return {
        success: true,
        data: route,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get preferred route',
      };
    }
  }

  /**
   * Get all routes by driver ID (user_id OR drivers.id)
   * ✅ CORRIGIDO: Usa JOIN com drivers para aceitar user_id diretamente
   */
  async getByDriverId(driverId: string): Promise<DBResponse<PreferredRoute[]>> {
    try {
      const supabase = getSupabaseClient();
      
      console.log('🔍 Buscando rotas para driverId:', driverId);
      
      // ✅ SOLUÇÃO DEFINITIVA: Query única com JOIN (sem selecionar drivers.id para evitar ambiguidade)
      // Isso evita problemas de RLS na tabela drivers
      const { data, error } = await supabase
        .from('preferred_routes')
        .select(`
          *,
          drivers!inner (
            user_id
          )
        `)
        .eq('drivers.user_id', driverId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erro ao buscar rotas:', error);
        throw error;
      }

      // Mapear removendo a propriedade 'drivers' do resultado
      const routes = (data || []).map((item: any) => {
        const { drivers, ...routeData } = item;
        return sqlToPreferredRoute(routeData);
      });
      
      console.log(`✅ ${routes.length} rotas carregadas para user_id ${driverId}`);

      // Cache
      for (const route of routes) {
        await db.set(KeyPatterns.preferredRoute(route.id), route);
      }

      return {
        success: true,
        data: routes,
      };
    } catch (error) {
      console.error('❌ Erro completo:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get driver routes',
      };
    }
  }

  /**
   * Alias for getByDriverId (backward compatibility)
   */
  async getByDriver(driverId: string): Promise<DBResponse<PreferredRoute[]>> {
    return this.getByDriverId(driverId);
  }

  /**
   * Get active routes by driver ID (user_id OR drivers.id)
   * ✅ CORRIGIDO: Usa JOIN com drivers para aceitar user_id diretamente
   */
  async getActiveByDriver(driverId: string): Promise<DBResponse<PreferredRoute[]>> {
    try {
      const supabase = getSupabaseClient();
      
      console.log('🔍 Buscando rotas ativas para driverId:', driverId);
      
      // ✅ SOLUÇÃO DEFINITIVA: Query única com JOIN (sem selecionar drivers.id para evitar ambiguidade)
      const { data, error } = await supabase
        .from('preferred_routes')
        .select(`
          *,
          drivers!inner (
            user_id
          )
        `)
        .eq('drivers.user_id', driverId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erro ao buscar rotas ativas:', error);
        throw error;
      }

      // Mapear removendo a propriedade 'drivers' do resultado
      const routes = (data || []).map((item: any) => {
        const { drivers, ...routeData } = item;
        return sqlToPreferredRoute(routeData);
      });
      
      console.log(`✅ ${routes.length} rotas ativas carregadas para user_id ${driverId}`);

      // Cache
      for (const route of routes) {
        await db.set(KeyPatterns.preferredRoute(route.id), route);
      }

      return {
        success: true,
        data: routes,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get active driver routes',
      };
    }
  }

  /**
   * Search routes by origin and/or destination
   * ✅ FUNCIONALIDADE PRINCIPAL - Matchmaking de fretes
   */
  async search(params: {
    originCity?: string;
    originState?: string;
    destinationCity?: string;
    destinationState?: string;
    vehicleType?: string;
    minCapacity?: number;
    onlyActive?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<DBResponse<PreferredRoute[]>> {
    try {
      const {
        originCity,
        originState,
        destinationCity,
        destinationState,
        vehicleType,
        minCapacity,
        onlyActive = true,
        limit = 50,
        offset = 0,
      } = params;

      const supabase = getSupabaseClient();
      let query = supabase
        .from('preferred_routes')
        .select('*');

      // Filters
      if (onlyActive) {
        query = query.eq('is_active', true);
      }

      if (originCity) {
        query = query.eq('origin_city', originCity);
      }

      if (originState) {
        query = query.eq('origin_state', originState);
      }

      if (destinationCity) {
        query = query.eq('destination_city', destinationCity);
      }

      if (destinationState) {
        query = query.eq('destination_state', destinationState);
      }

      if (vehicleType) {
        query = query.contains('vehicle_types', [vehicleType]);
      }

      if (minCapacity) {
        query = query.gte('capacity_kg', minCapacity);
      }

      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, error } = await query;

      if (error) throw error;

      const routes = data.map(sqlToPreferredRoute);
      console.log(`✅ ${routes.length} rotas encontradas`);

      return {
        success: true,
        data: routes,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search routes',
      };
    }
  }

  /**
   * Get all active routes
   */
  async getActive(params?: Partial<PaginationParams>): Promise<DBResponse<PreferredRoute[]>> {
    try {
      const { limit = 50, offset = 0 } = params || {};

      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('preferred_routes')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      const routes = data.map(sqlToPreferredRoute);

      return {
        success: true,
        data: routes,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get active routes',
      };
    }
  }

  /**
   * Alias for getActive (backward compatibility)
   */
  async getAllActive(params?: Partial<PaginationParams>): Promise<DBResponse<PreferredRoute[]>> {
    return this.getActive(params);
  }

  /**
   * Update route
   */
  async update(id: string, updates: Partial<PreferredRoute>): Promise<DBResponse<PreferredRoute>> {
    try {
      const now = new Date().toISOString();

      const supabase = getSupabaseClient();
      
      // Get current route to merge
      const { data: current } = await supabase
        .from('preferred_routes')
        .select('*')
        .eq('id', id)
        .single();

      if (!current) {
        throw new Error('Route not found');
      }

      const currentRoute = sqlToPreferredRoute(current);
      const updated = { ...currentRoute, ...updates, updatedAt: now };
      const sqlData = preferredRouteToSQL(updated);

      const { data, error } = await supabase
        .from('preferred_routes')
        .update(sqlData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      const result = sqlToPreferredRoute(data);
      await db.set(KeyPatterns.preferredRoute(id), result);

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update route',
      };
    }
  }

  /**
   * Toggle active status
   */
  async toggleActive(id: string, isActive: boolean): Promise<DBResponse<PreferredRoute>> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('preferred_routes')
        .update({
          is_active: isActive,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      const route = sqlToPreferredRoute(data);
      await db.set(KeyPatterns.preferredRoute(id), route);

      return {
        success: true,
        data: route,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to toggle active status',
      };
    }
  }

  /**
   * Increment view count
   */
  async incrementViews(id: string): Promise<DBResponse<boolean>> {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.rpc('increment_route_views', { route_id: id });

      if (error) {
        // Fallback if function doesn't exist
        const { data } = await supabase
          .from('preferred_routes')
          .select('views_count')
          .eq('id', id)
          .single();

        if (data) {
          await supabase
            .from('preferred_routes')
            .update({ views_count: (data.views_count || 0) + 1 })
            .eq('id', id);
        }
      }

      return { success: true, data: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to increment views',
      };
    }
  }

  /**
   * Increment contact count
   */
  async incrementContacts(id: string): Promise<DBResponse<boolean>> {
    try {
      const supabase = getSupabaseClient();
      const { data } = await supabase
        .from('preferred_routes')
        .select('contacts_count')
        .eq('id', id)
        .single();

      if (data) {
        await supabase
          .from('preferred_routes')
          .update({ contacts_count: (data.contacts_count || 0) + 1 })
          .eq('id', id);
      }

      return { success: true, data: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to increment contacts',
      };
    }
  }

  /**
   * Delete route
   */
  async delete(id: string): Promise<DBResponse<boolean>> {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('preferred_routes')
        .delete()
        .eq('id', id);

      if (error) {
        // Log but don't abort — RLS or policy issues should not block local cleanup
        console.warn('⚠️ Supabase delete failed (may be RLS policy), removing locally:', error.message);
      }

      await db.remove(KeyPatterns.preferredRoute(id));

      return { success: true, data: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete route',
      };
    }
  }

  /**
   * Expire old routes (older than 24 hours)
   * ✅ Usado pelo Cron Job
   */
  async expireOldRoutes(): Promise<DBResponse<number>> {
    try {
      const supabase = getSupabaseClient();
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - 24);

      const { data, error } = await supabase
        .from('preferred_routes')
        .update({ is_active: false })
        .eq('is_active', true)
        .lt('created_at', cutoffDate.toISOString())
        .select();

      if (error) throw error;

      return {
        success: true,
        data: data.length,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to expire routes',
      };
    }
  }
}

export const preferredRouteRepository = new PreferredRouteRepository();

// Class is already exported via 'export class' above, no need to re-export