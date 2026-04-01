import { useState, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '../supabase/client';
import type { PreferredRoute, Driver } from './schema';
import { database } from './index';
import { logger } from '../logger';

/**
 * Hook to fetch available drivers
 */
export function useAvailableDrivers() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDrivers = useCallback(async () => {
    setLoading(true);
    logger.debug('useAvailableDrivers', 'Carregando motoristas do Supabase...');
    
    try {
      const supabase = getSupabaseClient();
      
      // ✅ SOLUÇÃO: Buscar drivers SEM INNER JOIN (padrão CompaniesScreen)
      // Isso evita o erro "column reference 'id' is ambiguous"
      const { data: driversData, error: driversError } = await supabase
        .from('drivers')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (driversError) {
        logger.error('useAvailableDrivers', 'Erro ao carregar motoristas do Supabase:', driversError);
        setError(driversError.message);
        setDrivers([]);
        setLoading(false);
        return;
      }
      
      if (!driversData || driversData.length === 0) {
        logger.info('useAvailableDrivers', 'Nenhum motorista encontrado no Supabase');
        setDrivers([]);
        setError(null);
        setLoading(false);
        return;
      }
      
      logger.info('useAvailableDrivers', `${driversData.length} motoristas encontrados no Supabase`);
      
      // ✅ SOLUÇÃO: Buscar profiles SEPARADAMENTE (padrão CompaniesScreen)
      const userIds = driversData.map(d => d.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, email, phone, avatar_url, rating, total_freights, completed_freights')
        .in('id', userIds);
      
      if (profilesError) {
        logger.warn('useAvailableDrivers', 'Erro ao carregar perfis, continuando sem eles:', profilesError);
      }
      
      // ✅ Criar map de perfis para lookup rápido O(1)
      const profilesMap = new Map();
      if (profilesData) {
        profilesData.forEach(p => profilesMap.set(p.id, p));
      }
      
      logger.success('useAvailableDrivers', `✅ Perfis carregados: ${profilesData?.length || 0}`);
      
      // ✅ MERGE MANUAL: Combinar motoristas com perfis no código
      const driversWithProfiles = driversData.map((d: any) => {
        const profile = profilesMap.get(d.user_id) || {};
        
        // ✅ Avatar vem do profile (já está em PATH, será convertido em URL no componente)
        const avatarUrl = profile.avatar_url || d.profile_image || '';
        
        return {
          id: d.id,
          userId: d.user_id,
          user_id: d.user_id,
          name: profile.name || d.name || 'Motorista',
          email: profile.email || '',
          phone: profile.phone || d.phone || '',
          cpf: d.cpf || '',
          cnh: d.cnh || '',
          rg: d.rg || '',
          mopp: d.mopp || false,
          status: d.available === true ? 'available' : (d.available === false ? 'unavailable' : 'available'),
          vehicleTypes: d.vehicle_types || [],
          trailerTypes: d.trailer_type ? [d.trailer_type] : [],
          vehicle: {
            plate: d.vehicle_plate || '',
            model: d.vehicle_model || '',
            year: d.vehicle_year || 0,
            capacity: d.vehicle_capacity || '',
            type: d.vehicle_type || ''
          },
          currentLocation: d.current_location || null,
          rating: profile.rating || 0,
          totalTrips: profile.total_freights || 0,
          completedTrips: profile.completed_freights || 0,
          avatar: avatarUrl,
          avatarUrl: avatarUrl,
          verified: d.verified || false,
          lastActive: d.last_active || new Date().toISOString(),
          createdAt: d.created_at,
          updatedAt: d.updated_at
        };
      });
      
      logger.success('useAvailableDrivers', `✅ ${driversWithProfiles.length} motoristas processados com sucesso!`);
      
      setDrivers(driversWithProfiles);
      setError(null);
    } catch (err) {
      logger.error('useAvailableDrivers', 'Erro inesperado:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar motoristas');
      setDrivers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDrivers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ✅ EXECUTAR APENAS UMA VEZ na montagem

  return { drivers, loading, error, refresh: fetchDrivers };
}

/**
 * Hook to fetch all active preferred routes from all drivers
 */
export function useAllActivePreferredRoutes() {
  const [routes, setRoutes] = useState<PreferredRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRoutes = useCallback(async () => {
    setLoading(true);
    logger.debug('useAllActivePreferredRoutes', 'Carregando rotas do Supabase...');
    
    try {
      const supabase = getSupabaseClient();
      
      // ✅ VERIFICAR SESSÃO
      const { data: sessionData } = await supabase.auth.getSession();
      console.log('🔐 [useAllActivePreferredRoutes] Sessão:', {
        hasSession: !!sessionData?.session,
        userId: sessionData?.session?.user?.id,
        userEmail: sessionData?.session?.user?.email,
      });
      
      // ✅ BUSCAR ROTAS COM JOIN para incluir user_id do motorista
      const { data: routesData, error: routesError, count } = await supabase
        .from('preferred_routes')
        .select(`
          *,
          drivers!inner (
            user_id
          )
        `, { count: 'exact' })
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      console.log('📊 [useAllActivePreferredRoutes] Resultado da query:', {
        hasError: !!routesError,
        error: routesError,
        dataLength: routesData?.length || 0,
        count: count,
        firstRoute: routesData?.[0],
      });
      
      if (routesError) {
        logger.error('useAllActivePreferredRoutes', 'Erro ao carregar do Supabase:', routesError);
        console.error('❌ [useAllActivePreferredRoutes] Detalhes do erro:', {
          message: routesError.message,
          details: routesError.details,
          hint: routesError.hint,
          code: routesError.code,
        });
        setError(routesError.message);
        setRoutes([]);
        setLoading(false);
        return;
      }
      
      if (!routesData || routesData.length === 0) {
        logger.info('useAllActivePreferredRoutes', 'Nenhuma rota ativa encontrada no Supabase');
        console.log('⚠️ [useAllActivePreferredRoutes] Sem rotas - count no banco:', count);
        setRoutes([]);
        setError(null);
        setLoading(false);
        return;
      }
      
      // Transformar dados do Supabase para o formato PreferredRoute
      // ✅ CORRIGIDO: Agora usa user_id do JOIN com drivers
      const transformedRoutes: PreferredRoute[] = routesData.map((r: any) => ({
        id: r.id,
        driverId: r.drivers?.user_id || r.driver_id, // ✅ Usa user_id do JOIN, fallback para driver_id
        origin: r.origin,
        destination: r.destination,
        priority: r.priority || 'medium',
        notes: r.notes || '',
        isActive: r.is_active,
        createdAt: r.created_at,
        updatedAt: r.updated_at
      }));
      
      logger.success('useAllActivePreferredRoutes', `Rotas carregadas: ${transformedRoutes.length}`);
      
      setRoutes(transformedRoutes);
      setError(null);
    } catch (err) {
      logger.error('useAllActivePreferredRoutes', 'Erro inesperado:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar rotas');
      setRoutes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoutes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ✅ EXECUTAR APENAS UMA VEZ na montagem

  return { routes, loading, error, refresh: fetchRoutes };
}

/**
 * Load quotes by provider from Supabase
 */
export async function loadQuotesByProviderFromSupabase(providerId: string) {
  try {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('quotes')
      .select('*')
      .eq('bidder_id', providerId)
      .order('created_at', { ascending: false });
    
    if (error) {
      logger.error('loadQuotesByProviderFromSupabase', 'Erro ao buscar cotações:', error);
      console.error('❌ [loadQuotesByProviderFromSupabase] Erro:', error);
      return [];
    }
    
    if (!data || data.length === 0) {
      return [];
    }
    
    // Transformar do formato Supabase para o formato da aplicação
    const quotes = data.map((q: any) => ({
      id: q.id,
      freightId: q.freight_id,
      providerId: q.bidder_id,
      providerName: q.metadata?.providerName || 'Motorista',
      providerType: q.metadata?.providerType || 'caminhoneiro',
      proposedPrice: q.proposed_value?.toString() || '0',
      deliveryEstimate: q.delivery_time_days?.toString() || '',
      observations: q.observations || '',
      discount: q.discount || '0',
      status: q.status || 'pending',
      validUntil: q.valid_until || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      provider: q.metadata?.provider || {},
      createdAt: q.created_at,
      updatedAt: q.updated_at
    }));
    
    return quotes;
  } catch (error) {
    logger.error('loadQuotesByProviderFromSupabase', 'Erro inesperado:', error);
    console.error('❌ [loadQuotesByProviderFromSupabase] Erro inesperado:', error);
    return [];
  }
}

/**
 * Load quotes by freight from Supabase
 */
export async function loadQuotesByFreightFromSupabase(freightId: string) {
  try {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('quotes')
      .select('*')
      .eq('freight_id', freightId)
      .order('created_at', { ascending: false });
    
    if (error) {
      logger.error('loadQuotesByFreightFromSupabase', 'Erro ao buscar cotações:', error);
      return [];
    }
    
    if (!data || data.length === 0) {
      return [];
    }
    
    // Transformar do formato Supabase para o formato da aplicação
    const quotes = data.map((q: any) => ({
      id: q.id,
      freightId: q.freight_id,
      providerId: q.bidder_id,
      providerName: q.metadata?.providerName || 'Motorista',
      providerType: q.metadata?.providerType || 'caminhoneiro',
      proposedPrice: q.proposed_value?.toString() || '0',
      deliveryEstimate: q.delivery_time_days?.toString() || '',
      observations: q.observations || '',
      discount: q.discount || '0',
      status: q.status || 'pending',
      validUntil: q.valid_until || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      provider: q.metadata?.provider || {},
      createdAt: q.created_at,
      updatedAt: q.updated_at
    }));
    
    return quotes;
  } catch (error) {
    logger.error('loadQuotesByFreightFromSupabase', 'Erro inesperado:', error);
    return [];
  }
}