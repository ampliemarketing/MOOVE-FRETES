/**
 * Hook para sincronização universal de dados
 */

import { useEffect, useState, useCallback } from 'react';
import {
  syncAllUserData,
  loadAllUserDataFromSupabase,
  startAutoSync,
  stopAutoSync,
  getSyncStatus,
  updateSyncStatus,
  type SyncStatus
} from '../universal-sync';

export function useUniversalSync(userId: string | null, autoSync: boolean = true) {
  const [status, setStatus] = useState<SyncStatus>(getSyncStatus());
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<any>(null);

  // Função para sincronizar manualmente
  const sync = useCallback(async () => {
    if (!userId || isSyncing) return;

    setIsSyncing(true);
    try {
      const result = await syncAllUserData(userId);
      setLastSyncResult(result);
      setStatus(getSyncStatus());
      return result;
    } catch (error) {
      console.error('Erro na sincronização:', error);
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, [userId, isSyncing]);

  // Função para carregar dados do Supabase
  const loadFromSupabase = useCallback(async () => {
    if (!userId) return;

    try {
      await loadAllUserDataFromSupabase(userId);
      setStatus(getSyncStatus());
    } catch (error) {
      console.error('Erro ao carregar do Supabase:', error);
    }
  }, [userId]);

  // Função para ativar/desativar auto-sync
  const toggleAutoSync = useCallback((enabled: boolean) => {
    updateSyncStatus({ autoSync: enabled });
    setStatus(getSyncStatus());
  }, []);

  // Iniciar auto-sync quando o usuário estiver logado
  useEffect(() => {
    if (userId && autoSync && status.autoSync) {
      startAutoSync(userId, 0.166667); // ✅ Sync a cada 10 segundos
      
      return () => {
        stopAutoSync();
      };
    }
  }, [userId, autoSync, status.autoSync]);

  // Atualizar status periodicamente
  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(getSyncStatus());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return {
    status,
    isSyncing,
    lastSyncResult,
    sync,
    loadFromSupabase,
    toggleAutoSync
  };
}