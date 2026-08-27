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
      
      
      // 1. Tentar carregar do Supabase primeiro
      const supabaseRoutes = await loadActiveRoutesFromSupabase();
      
      if (supabaseRoutes.length > 0) {
        setRoutes(supabaseRoutes);
        
        // ⚠️ NÃO chamar database.preferredRoutes.create aqui pois causaria duplicação
        // As rotas já estão no Supabase e serão carregadas quando necessário
      } else {
        // 2. Fallback: carregar do LocalStorage
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
    setRoutes(prev => {
      const exists = prev.some(r => r.id === route.id);
      // Rota desativada some da lista pública ao vivo
      if (!route.isActive) {
        return prev.filter(r => r.id !== route.id);
      }
      // Rota reativada que não estava na lista entra ao vivo
      if (!exists) {
        return [route, ...prev];
      }
      return prev.map(r => r.id === route.id ? route : r);
    });
  }, []);

  // Callback para rota deletada
  const handleRouteDeleted = useCallback((routeId: string) => {
    
    setRoutes(prev => prev.filter(r => r.id !== routeId));
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadRoutes();

    // Inscrever no realtime (async — garante socket autenticado antes de assinar)
    subscribeToRoutesRealtime({
      onRoutePublished: handleRoutePublished,
      onRouteUpdated: handleRouteUpdated,
      onRouteDeleted: handleRouteDeleted,
    }).then((channel) => {
      if (cancelled) {
        unsubscribeFromRealtime(channel);
      } else {
        channelRef.current = channel;
      }
    });

    // Cleanup
    return () => {
      cancelled = true;
      unsubscribeFromRealtime(channelRef.current);
      channelRef.current = null;
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
      
      
      // ✅ Se driverId vazio, carregar TODAS as rotas ativas (view pública)
      if (!driverId || driverId === '') {
        const supabaseRoutes = await loadActiveRoutesFromSupabase();
        
        setRoutes(supabaseRoutes);
      } else {
        // ✅ Se driverId preenchido, carregar apenas do motorista específico
        const result = await database.preferredRoutes.getByDriver(driverId);
        
        if (result.success && result.data) {
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
        // [REVISAR] console.warn('⚠️ Rota com ID legado (não-UUID), atualizando apenas no LocalStorage:', routeId);
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
        // [REVISAR] console.warn('⚠️ Rota com ID legado (não-UUID), atualizando apenas no LocalStorage:', routeId);
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
    // Optimistic update: remove da UI imediatamente
    setRoutes(prev => prev.filter(r => r.id !== routeId));

    try {
      const deleteResult = await database.preferredRoutes.delete(routeId);

      if (!deleteResult.success) {
        toast.error('Erro ao deletar rota');
        return { success: false, error: deleteResult.error };
      }

      toast.success('Rota deletada com sucesso!');
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao deletar rota';
      toast.error(message);
      return { success: false, error: message };
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let channel: any = null;
    let refetchTimer: any = null;
    loadRoutes();

    const isPublic = !driverId || driverId === '';

    // Recarrega a lista com debounce — usado na visão pessoal do motorista,
    // onde os eventos vêm com drivers.id (não o user_id) e não dá para casar
    // incrementalmente sem uma consulta.
    const scheduleRefetch = () => {
      if (refetchTimer) clearTimeout(refetchTimer);
      refetchTimer = setTimeout(() => { if (!cancelled) loadRoutes(); }, 250);
    };

    const callbacks = isPublic
      ? {
          onRoutePublished: (route: PreferredRoute) => {
            setRoutes(prev => (prev.some(r => r.id === route.id) ? prev : [route, ...prev]));
          },
          onRouteUpdated: (route: PreferredRoute) => {
            setRoutes(prev => {
              const exists = prev.some(r => r.id === route.id);
              if (!route.isActive) return prev.filter(r => r.id !== route.id);
              if (!exists) return [route, ...prev];
              return prev.map(r => (r.id === route.id ? route : r));
            });
          },
          onRouteDeleted: (routeId: string) => {
            setRoutes(prev => prev.filter(r => r.id !== routeId));
          },
        }
      : {
          onRoutePublished: scheduleRefetch,
          onRouteUpdated: scheduleRefetch,
          onRouteDeleted: scheduleRefetch,
        };

    subscribeToRoutesRealtime(callbacks).then((ch) => {
      if (cancelled) unsubscribeFromRealtime(ch);
      else channel = ch;
    });

    return () => {
      cancelled = true;
      if (refetchTimer) clearTimeout(refetchTimer);
      unsubscribeFromRealtime(channel);
    };
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