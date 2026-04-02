/**
 * Hook de Sincronização Automática
 * Gerencia sincronização inteligente entre LocalStorage e Supabase
 */

import { useEffect, useRef, useState } from 'react';
import { syncAllUserData } from '../universal-sync';
import { checkSupabaseAvailability, recheckSupabaseAvailability } from '../offline-mode';
import { toast } from 'sonner@2.0.3';

interface AutoSyncOptions {
  userId: string;
  enabled?: boolean;
  syncInterval?: number; // em milissegundos
  onSyncSuccess?: (syncedItems: number) => void;
  onSyncError?: (error: string) => void;
}

interface SyncState {
  isSyncing: boolean;
  lastSyncTime: Date | null;
  lastSyncSuccess: boolean;
  syncedItemsCount: number;
  isOnline: boolean;
  retryCount: number;
}

const MAX_RETRIES = 3;
const BASE_RETRY_DELAY = 5000; // 5 segundos
const DEFAULT_SYNC_INTERVAL = 30000; // 30 segundos

export function useAutoSync(options: AutoSyncOptions) {
  const {
    userId,
    enabled = true,
    syncInterval = DEFAULT_SYNC_INTERVAL,
    onSyncSuccess,
    onSyncError
  } = options;

  const [syncState, setSyncState] = useState<SyncState>({
    isSyncing: false,
    lastSyncTime: null,
    lastSyncSuccess: true,
    syncedItemsCount: 0,
    isOnline: navigator.onLine,
    retryCount: 0
  });

  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSyncingRef = useRef(false);

  /**
   * Executa sincronização
   */
  const performSync = async (showToast = false) => {
    // Evitar múltiplas sincronizações simultâneas
    if (isSyncingRef.current) {
      return;
    }
    
    isSyncingRef.current = true;
    setSyncState(prev => ({ ...prev, isSyncing: true }));

    if (showToast) {
      toast.info('🔄 Sincronizando dados...');
    }

    try {
      const result = await syncAllUserData(userId);
      
      const totalSynced = result.totalSynced || 0;
      
      // Sempre considerar sucesso - sistema funciona sem sincronização
      console.log(`✅ Sincronização concluída: ${totalSynced} itens`);
      
      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        lastSyncTime: new Date(),
        lastSyncSuccess: true,
        syncedItemsCount: totalSynced,
        retryCount: 0
      }));

      if (showToast && totalSynced > 0) {
        toast.success(`✅ ${totalSynced} ${totalSynced === 1 ? 'item sincronizado' : 'itens sincronizados'}`);
      }

      onSyncSuccess?.(totalSynced);
    } catch (error) {
      // Sincronização é opcional — não bloqueia o sistema
      console.warn('[Sync] Falha na sincronização (não crítico):', error);

      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        lastSyncSuccess: false,
        retryCount: 0
      }));
    } finally {
      isSyncingRef.current = false;
    }
  };

  /**
   * Sincronização manual
   */
  const manualSync = () => {
    performSync(true);
  };

  /**
   * Monitor de conectividade de rede
   */
  useEffect(() => {
    if (!enabled) return;

    const handleOnline = async () => {
      console.log('🌐 Conexão restaurada, verificando Supabase...');
      setSyncState(prev => ({ ...prev, isOnline: true }));
      
      // Verificar se Supabase está disponível
      const available = await recheckSupabaseAvailability();
      
      if (available) {
        console.log('✅ Supabase disponível, iniciando sincronização...');
        toast.success('🌐 Conexão restaurada');
        // Sincronizar após 2 segundos
        setTimeout(() => performSync(true), 2000);
      }
    };

    const handleOffline = () => {
      console.log('📴 Conexão perdida');
      setSyncState(prev => ({ ...prev, isOnline: false }));
      toast.warning('📴 Modo offline - dados serão salvos localmente');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [enabled]);

  /**
   * Monitor de visibilidade da página
   */
  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('👁️ App voltou ao foco, verificando sincronização...');
        
        // Sincronizar se última sync foi há mais de 30 segundos
        if (syncState.lastSyncTime) {
          const timeSinceLastSync = Date.now() - syncState.lastSyncTime.getTime();
          if (timeSinceLastSync > 30000) {
            performSync(false);
          }
        } else {
          performSync(false);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, syncState.lastSyncTime]);

  /**
   * Sincronização periódica automática
   */
  useEffect(() => {
    if (!enabled) return;

    // Sincronizar imediatamente ao montar
    const initialSync = async () => {
      await new Promise(resolve => setTimeout(resolve, 3000)); // Aguardar 3s após mount
      performSync(false);
    };
    initialSync();

    // Configurar sincronização periódica
    syncIntervalRef.current = setInterval(() => {
      if (navigator.onLine) {
        performSync(false);
      }
    }, syncInterval);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [enabled, userId, syncInterval]);

  return {
    ...syncState,
    manualSync
  };
}