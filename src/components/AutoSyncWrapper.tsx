/**
 * Wrapper para Sincronização Automática
 * Integra o hook useAutoSync e exibe feedback visual
 */

import React from 'react';
import { useAutoSync } from '@/utils/hooks/useAutoSync';
import { toast } from 'sonner@2.0.3';

interface AutoSyncWrapperProps {
  userId: string;
  children: React.ReactNode;
}

export function AutoSyncWrapper({ userId, children }: AutoSyncWrapperProps) {
  const syncState = useAutoSync({
    userId,
    enabled: true,
    syncInterval: 30000, // 30 segundos
    onSyncSuccess: (syncedItems) => {
      if (syncedItems > 0) {
      }
    },
    onSyncError: (error) => {
      console.error('❌ Erro na sincronização automática:', error);
    }
  });

  // Log status changes para debug
  React.useEffect(() => {
    if (syncState.lastSyncTime) {
      // [REVISAR] console.log('📊 Status de sincronização:', {
      // lastSync: syncState.lastSyncTime.toLocaleTimeString('pt-BR'),
      // isSyncing: syncState.isSyncing,
      // isOnline: syncState.isOnline,
      // syncedItems: syncState.syncedItemsCount
      // });
    }
  }, [syncState.lastSyncTime, syncState.syncedItemsCount]);

  return <>{children}</>;
}
