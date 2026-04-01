import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Cloud, CloudOff, RefreshCw, Check, AlertCircle, Database } from 'lucide-react';
import { getSyncStatus, syncAllUserData } from '../utils/universal-sync';
import { Button } from './ui/button';
import { toast } from 'sonner@2.0.3';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover';

interface SyncStatusIndicatorProps {
  userId: string;
}

export function SyncStatusIndicator({ userId }: SyncStatusIndicatorProps) {
  const [syncStatus, setSyncStatus] = useState(getSyncStatus());
  const [isSyncing, setIsSyncing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Atualizar status a cada segundo
  useEffect(() => {
    const interval = setInterval(() => {
      setSyncStatus(getSyncStatus());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleManualSync = async () => {
    if (isSyncing) return;

    setIsSyncing(true);
    toast.info('Iniciando sincronização...');

    try {
      const result = await syncAllUserData(userId);
      
      if (result.success) {
        toast.success(`✅ ${result.totalSynced} itens sincronizados`);
      } else {
        const errorCount = Object.values(result.results)
          .reduce((sum, r) => sum + r.errors.length, 0);
        toast.warning(`⚠️ Sincronizado com ${errorCount} erro(s)`);
      }
    } catch (error) {
      toast.error('Erro ao sincronizar dados');
      console.error('Sync error:', error);
    } finally {
      setIsSyncing(false);
      setSyncStatus(getSyncStatus());
    }
  };

  const getTimeSinceSync = () => {
    if (!syncStatus.lastSync) return 'Nunca';
    
    const now = new Date();
    const lastSync = new Date(syncStatus.lastSync);
    const diffMs = now.getTime() - lastSync.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Agora';
    if (diffMins === 1) return '1 minuto atrás';
    if (diffMins < 60) return `${diffMins} minutos atrás`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return '1 hora atrás';
    if (diffHours < 24) return `${diffHours} horas atrás`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return '1 dia atrás';
    return `${diffDays} dias atrás`;
  };

  const getStatusIcon = () => {
    if (isSyncing || syncStatus.pendingSync) {
      return <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />;
    }
    
    if (!syncStatus.lastSync) {
      return <CloudOff className="w-4 h-4 text-gray-400" />;
    }
    
    return <Cloud className="w-4 h-4 text-green-500" />;
  };

  const getStatusText = () => {
    if (isSyncing || syncStatus.pendingSync) return 'Sincronizando...';
    if (!syncStatus.lastSync) return 'Não sincronizado';
    return 'Sincronizado';
  };

  const getStatusColor = () => {
    if (isSyncing || syncStatus.pendingSync) return 'text-blue-600';
    if (!syncStatus.lastSync) return 'text-gray-500';
    return 'text-green-600';
  };

  return (
    <Popover open={showDetails} onOpenChange={setShowDetails}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-2 text-xs"
        >
          {getStatusIcon()}
          <span className={`hidden md:inline ${getStatusColor()}`}>
            {getStatusText()}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Database className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium">Sincronização Supabase</h4>
              <p className="text-xs text-muted-foreground">
                LocalStorage ↔️ Nuvem
              </p>
            </div>
          </div>

          {/* Status Cards */}
          <div className="space-y-2">
            {/* Última Sincronização */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                <span className="text-sm">Última sincronização</span>
              </div>
              <span className="text-sm font-medium">{getTimeSinceSync()}</span>
            </div>

            {/* Auto-Sync Status */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-blue-500" />
                <span className="text-sm">Sincronização automática</span>
              </div>
              <span className="text-sm font-medium">
                {syncStatus.autoSync ? (
                  <span className="text-green-600">Ativa</span>
                ) : (
                  <span className="text-gray-500">Pausada</span>
                )}
              </span>
            </div>

            {/* Pending Status */}
            {syncStatus.pendingSync && (
              <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-blue-700">Sincronização em andamento...</span>
                </div>
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-700">
              💡 <strong>Dica:</strong> Os dados são salvos localmente e sincronizados 
              automaticamente com a nuvem a cada 5 minutos.
            </p>
          </div>

          {/* Action Button */}
          <Button
            onClick={handleManualSync}
            disabled={isSyncing || syncStatus.pendingSync}
            className="w-full"
            size="sm"
          >
            {isSyncing || syncStatus.pendingSync ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Sincronizando...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Sincronizar Agora
              </>
            )}
          </Button>

          {/* Technical Details */}
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer hover:text-foreground">
              Detalhes técnicos
            </summary>
            <div className="mt-2 p-2 bg-muted rounded text-xs font-mono space-y-1">
              <div>Auto-sync: {syncStatus.autoSync ? 'ON' : 'OFF'}</div>
              <div>Pending: {syncStatus.pendingSync ? 'YES' : 'NO'}</div>
              <div>
                Last Sync: {syncStatus.lastSync 
                  ? new Date(syncStatus.lastSync).toLocaleString('pt-BR')
                  : 'N/A'
                }
              </div>
              <div>User ID: {userId.substring(0, 8)}...</div>
            </div>
          </details>
        </div>
      </PopoverContent>
    </Popover>
  );
}
