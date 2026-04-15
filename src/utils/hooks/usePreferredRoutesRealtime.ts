/**
 * Hook para gerenciamento de rotas preferidas com sincronização Supabase em tempo real
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner@2.0.3';
import type { PreferredRoute } from '../database/schema';
import { 
  loadActiveRoutesFromSupabase, 
  createPreferredRouteAndSync,
  updatePreferredRouteAndSync,
  subscribeToRoutesRealtime,
  unsubscribeFromRealtime
} from '../supabase-sync';
import { database } from '../database';

export interface UsePreferredRoutesRealtimeOptions {
  onNewRoute?: (route: PreferredRoute) => void;
}

/**
 * Hook para visualizar todas as rotas ativas (para transportadoras/agenciadores)
 */
export function useAvailableRoutesRealtime({ onNewRoute }: UsePreferredRoutesRealtimeOptions = {}) {
  const [routes, setRoutes] = useState<PreferredRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<any>(null);

  // Carregar rotas ativas iniciais
  const loadRoutes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📥 Carregando rotas preferidas ativas...');
      
      // 1. Tentar carregar do Supabase primeiro
      const supabaseRoutes = await loadActiveRoutesFromSupabase();
      
      if (supabaseRoutes.length > 0) {
        console.log('✅ Rotas carregadas do Supabase:', supabaseRoutes.length);
        setRoutes(supabaseRoutes);
        
        // ⚠️ NÃO chamar database.preferredRoutes.create aqui pois causaria duplicação
        // As rotas já estão no Supabase e serão carregadas quando necessário
      } else {
        // 2. Fallback: carregar do LocalStorage
        console.log('📦 Carregando rotas do LocalStorage...');
        const localResult = await database.preferredRoutes.getAllActive();
        
        if (localResult.success && localResult.data) {
          setRoutes(localResult.data);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar rotas';
      setError(message);
      console.error('❌ Erro ao carregar rotas:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Callback para nova rota publicada
  const handleRoutePublished = useCallback((route: PreferredRoute) => {
    console.log('🆕 Nova rota publicada em tempo real:', route);
    
    setRoutes(prev => {
      // Evitar duplicatas
      if (prev.some(r => r.id === route.id)) {
        return prev;
      }
      return [route, ...prev];
    });
    
    // Notificar callback externo
    if (onNewRoute) {
      onNewRoute(route);
    }
  }, [onNewRoute]);

  // Callback para rota atualizada
  const handleRouteUpdated = useCallback((route: PreferredRoute) => {
    console.log('📝 Rota atualizada em tempo real:', route);
    
    setRoutes(prev => prev.map(r => r.id === route.id ? route : r));
  }, []);

  // Callback para rota deletada
  const handleRouteDeleted = useCallback((routeId: string) => {
    console.log('🗑️ Rota deletada em tempo real:', routeId);
    
    setRoutes(prev => prev.filter(r => r.id !== routeId));
  }, []);

  useEffect(() => {
    loadRoutes();

    // Inscrever no realtime
    channelRef.current = subscribeToRoutesRealtime({
      onRoutePublished: handleRoutePublished,
      onRouteUpdated: handleRouteUpdated,
      onRouteDeleted: handleRouteDeleted,
    });

    // Cleanup
    return () => {
      unsubscribeFromRealtime();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ✅ EXECUTAR APENAS UMA VEZ - Os callbacks são estáveis

  return {
    routes,
    loading,
    error,
    refresh: loadRoutes,
  };
}

/**
 * Hook para motorista gerenciar suas próprias rotas
 * ✅ AGORA suporta buscar TODAS as rotas quando driverId está vazio
 */
export function useMyPreferredRoutes(driverId: string) {
  const [routes, setRoutes] = useState<PreferredRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carregar minhas rotas (ou todas se driverId vazio)
  const loadRoutes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📥 Carregando rotas...', driverId ? `(motorista: ${driverId})` : '(todas as rotas)');
      
      // ✅ Se driverId vazio, carregar TODAS as rotas ativas (view pública)
      if (!driverId || driverId === '') {
        console.log('🌍 Carregando TODAS as rotas ativas do Supabase...');
        const supabaseRoutes = await loadActiveRoutesFromSupabase();
        
        console.log(`✅ ${supabaseRoutes.length} rotas ativas carregadas do Supabase`);
        setRoutes(supabaseRoutes);
      } else {
        // ✅ Se driverId preenchido, carregar apenas do motorista específico
        const result = await database.preferredRoutes.getByDriver(driverId);
        
        if (result.success && result.data) {
          console.log(`✅ ${result.data.length} rotas do motorista carregadas`);
          setRoutes(result.data);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar rotas';
      setError(message);
      console.error('Error loading routes:', err);
    } finally {
      setLoading(false);
    }
  }, [driverId]);

  // Criar nova rota
  const createRoute = useCallback(async (route: Partial<PreferredRoute>) => {
    try {
      console.log('📤 Criando nova rota preferida...');
      
      const result = await createPreferredRouteAndSync({
        ...route,
        driverId
      });
      
      if (result.success && result.data) {
        // Adicionar à lista local imediatamente (otimistic update)
        setRoutes(prev => [result.data!, ...prev]);
        toast.success('Rota publicada com sucesso!');
        return { success: true, data: result.data };
      }
      
      toast.error(result.error || 'Erro ao publicar rota');
      return { success: false, error: result.error };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao publicar rota';
      toast.error(message);
      return { success: false, error: message };
    }
  }, [driverId]);

  // Atualizar rota
  const updateRoute = useCallback(async (routeId: string, updates: Partial<PreferredRoute>) => {
    try {
      console.log('📝 Atualizando rota:', routeId);
      
      const result = await updatePreferredRouteAndSync(routeId, updates);
      
      if (result.success) {
        // Atualizar lista local (otimistic update)
        setRoutes(prev => prev.map(r => 
          r.id === routeId ? { ...r, ...updates } : r
        ));
        
        toast.success('Rota atualizada!');
        return { success: true };
      }
      
      toast.error(result.error || 'Erro ao atualizar rota');
      return { success: false, error: result.error };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar rota';
      toast.error(message);
      return { success: false, error: message };
    }
  }, []);

  // Desativar rota (não deleta, apenas marca como inativa)
  const deactivateRoute = useCallback(async (routeId: string) => {
    try {
      console.log('🔴 Desativando rota:', routeId);
      
      // Verificar se o ID é um UUID válido
      const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(routeId);
      
      if (isValidUUID) {
        // Atualizar no Supabase (apenas se for UUID válido)
        const result = await updatePreferredRouteAndSync(routeId, { isActive: false });
        
        if (result.success) {
          // Atualizar na lista local (otimistic update) - mantém na lista mas marca como inativa
          setRoutes(prev => prev.map(r => 
            r.id === routeId ? { ...r, isActive: false } : r
          ));
          
          toast.success('Rota desativada!');
          return { success: true };
        }
        
        toast.error(result.error || 'Erro ao desativar rota');
        return { success: false, error: result.error };
      } else {
        // ID legado - atualizar apenas no LocalStorage
        console.warn('⚠️ Rota com ID legado (não-UUID), atualizando apenas no LocalStorage:', routeId);
        const result = await database.preferredRoutes.update(routeId, { isActive: false });
        
        if (result.success) {
          setRoutes(prev => prev.map(r => 
            r.id === routeId ? { ...r, isActive: false } : r
          ));
          
          toast.success('Rota desativada! (apenas local)');
          return { success: true };
        }
        
        toast.error('Erro ao desativar rota');
        return { success: false, error: result.error };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao desativar rota';
      toast.error(message);
      return { success: false, error: message };
    }
  }, []);

  // Reativar rota
  const reactivateRoute = useCallback(async (routeId: string) => {
    try {
      console.log('🟢 Reativando rota:', routeId);
      
      // Verificar se o ID é um UUID válido
      const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(routeId);
      
      if (isValidUUID) {
        // Atualizar no Supabase (apenas se for UUID válido)
        const result = await updatePreferredRouteAndSync(routeId, { isActive: true });
        
        if (result.success) {
          // Atualizar na lista local (otimistic update)
          setRoutes(prev => prev.map(r => 
            r.id === routeId ? { ...r, isActive: true } : r
          ));
          
          toast.success('Rota reativada!');
          return { success: true };
        }
        
        toast.error(result.error || 'Erro ao reativar rota');
        return { success: false, error: result.error };
      } else {
        // ID legado - atualizar apenas no LocalStorage
        console.warn('⚠️ Rota com ID legado (não-UUID), atualizando apenas no LocalStorage:', routeId);
        const result = await database.preferredRoutes.update(routeId, { isActive: true });
        
        if (result.success) {
          setRoutes(prev => prev.map(r => 
            r.id === routeId ? { ...r, isActive: true } : r
          ));
          
          toast.success('Rota reativada! (apenas local)');
          return { success: true };
        }
        
        toast.error('Erro ao reativar rota');
        return { success: false, error: result.error };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao reativar rota';
      toast.error(message);
      return { success: false, error: message };
    }
  }, []);

  // Deletar rota permanentemente
  const deleteRoute = useCallback(async (routeId: string) => {
    try {
      // database.preferredRoutes.delete já gerencia Supabase + localStorage.
      // Não chamamos o Supabase diretamente aqui para evitar dupla deleção:
      // a segunda tentativa de deletar uma linha já removida gera erro no
      // servidor, que fazia o hook exibir toast de erro mesmo após sucesso.
      const deleteResult = await database.preferredRoutes.delete(routeId);

      if (!deleteResult.success) {
        toast.error('Erro ao deletar rota');
        return { success: false, error: deleteResult.error };
      }

      setRoutes(prev => prev.filter(r => r.id !== routeId));
      toast.success('Rota deletada com sucesso!');
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao deletar rota';
      toast.error(message);
      return { success: false, error: message };
    }
  }, []);

  useEffect(() => {
    loadRoutes();
    
    // ✅ Se for visualização pública (driverId vazio), inscrever no realtime
    if (!driverId || driverId === '') {
      console.log('📡 Inscrevendo no realtime de rotas públicas...');
      
      const channel = subscribeToRoutesRealtime({
        onRoutePublished: (route) => {
          console.log('🆕 Nova rota publicada:', route);
          setRoutes(prev => {
            // Evitar duplicatas
            if (prev.some(r => r.id === route.id)) {
              return prev;
            }
            return [route, ...prev];
          });
        },
        onRouteUpdated: (route) => {
          console.log('📝 Rota atualizada:', route);
          setRoutes(prev => prev.map(r => r.id === route.id ? route : r));
        },
        onRouteDeleted: (routeId) => {
          console.log('🗑️ Rota deletada:', routeId);
          setRoutes(prev => prev.filter(r => r.id !== routeId));
        }
      });
      
      // Cleanup
      return () => {
        console.log('🔌 Desconectando do realtime de rotas públicas...');
        unsubscribeFromRealtime();
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driverId]); // ✅ Apenas driverId como dependência - loadRoutes é estável

  return {
    routes,
    loading,
    error,
    createRoute,
    updateRoute,
    deactivateRoute,
    reactivateRoute,
    deleteRoute,
    refresh: loadRoutes,
  };
}

/**
 * Hook para buscar rotas por filtros
 */
export function useSearchPreferredRoutes() {
  const [routes, setRoutes] = useState<PreferredRoute[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchRoutes = useCallback(async (filters: {
    originState?: string;
    destinationState?: string;
    originCity?: string;
    destinationCity?: string;
  }) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 Buscando rotas com filtros:', filters);
      
      // Carregar todas as rotas ativas
      const allRoutes = await loadActiveRoutesFromSupabase();
      
      // Aplicar filtros
      let filteredRoutes = allRoutes;
      
      if (filters.originState) {
        filteredRoutes = filteredRoutes.filter(r => 
          r.origin.state.toLowerCase() === filters.originState!.toLowerCase()
        );
      }
      
      if (filters.destinationState) {
        filteredRoutes = filteredRoutes.filter(r => 
          r.destination.state.toLowerCase() === filters.destinationState!.toLowerCase()
        );
      }
      
      if (filters.originCity) {
        filteredRoutes = filteredRoutes.filter(r => 
          r.origin.city.toLowerCase().includes(filters.originCity!.toLowerCase())
        );
      }
      
      if (filters.destinationCity) {
        filteredRoutes = filteredRoutes.filter(r => 
          r.destination.city.toLowerCase().includes(filters.destinationCity!.toLowerCase())
        );
      }
      
      setRoutes(filteredRoutes);
      console.log('✅ Rotas filtradas:', filteredRoutes.length);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar rotas';
      setError(message);
      console.error('Error searching routes:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    routes,
    loading,
    error,
    searchRoutes,
  };
}