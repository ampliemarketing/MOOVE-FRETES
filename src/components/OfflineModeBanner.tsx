/**
 * Banner de Modo Offline
 * Mostra quando o sistema está operando em modo offline (sem Supabase)
 */

import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, X, AlertCircle, CheckCircle2, Wifi } from 'lucide-react';
import { isInOfflineMode, recheckSupabaseAvailability, getOfflineStatus, onStatusChange } from '@/utils/offline-mode';
import { motion, AnimatePresence } from 'motion/react';

export function OfflineModeBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [justReconnected, setJustReconnected] = useState(false);

  useEffect(() => {
    // Verificar status inicial
    setIsOffline(isInOfflineMode());

    // Monitorar mudanças de status com o novo sistema
    const unsubscribe = onStatusChange((isOnline) => {
      setIsOffline(!isOnline);
      
      // Se voltou online, mostrar mensagem de sucesso
      if (isOnline) {
        setJustReconnected(true);
        setIsDismissed(false);
        
        // Esconder mensagem de sucesso após 5 segundos
        setTimeout(() => {
          setJustReconnected(false);
          setIsDismissed(true);
        }, 5000);
      } else {
        setJustReconnected(false);
        setIsDismissed(false);
      }
    });

    // Verificar status a cada 10 segundos (backup)
    const interval = setInterval(() => {
      const offline = isInOfflineMode();
      setIsOffline(offline);
    }, 10000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      const available = await recheckSupabaseAvailability();
      if (available) {
        setIsOffline(false);
        setJustReconnected(true);
        
        // Auto-dismiss após 5 segundos
        setTimeout(() => {
          setJustReconnected(false);
          setIsDismissed(true);
        }, 5000);
      }
    } finally {
      setIsRetrying(false);
    }
  };

  // Banner de conexão restaurada (verde)
  if (justReconnected && !isOffline) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-0 left-0 right-0 z-50 pointer-events-none"
        >
          <div className="max-w-4xl mx-auto px-4 pt-4">
            <div className="bg-green-50 border border-green-200 rounded-lg shadow-lg pointer-events-auto">
              <div className="flex items-center gap-3 p-4">
                <div className="flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-green-800">
                    Conexão Restaurada
                  </p>
                  <p className="text-xs text-green-700 mt-0.5">
                    Sistema online. Seus dados estão sendo sincronizados automaticamente.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setJustReconnected(false);
                    setIsDismissed(true);
                  }}
                  className="p-1 hover:bg-green-100 rounded transition-colors"
                  aria-label="Fechar"
                >
                  <X className="w-4 h-4 text-green-600" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // Banner de modo offline (amarelo)
  if (!isOffline || isDismissed) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        className="fixed top-0 left-0 right-0 z-50 pointer-events-none"
      >
        <div className="max-w-4xl mx-auto px-4 pt-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg shadow-lg pointer-events-auto">
            <div className="flex items-center gap-3 p-4">
              <div className="flex-shrink-0">
                <WifiOff className="w-5 h-5 text-yellow-600" />
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-yellow-800">
                  Modo Offline
                </p>
                <p className="text-xs text-yellow-700 mt-0.5">
                  Não foi possível conectar ao servidor. Seus dados serão salvos localmente e sincronizados quando a conexão for restaurada.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleRetry}
                  disabled={isRetrying}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded text-xs font-medium transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
                  {isRetrying ? 'Verificando...' : 'Tentar Novamente'}
                </button>
                
                <button
                  onClick={() => setIsDismissed(true)}
                  className="p-1 hover:bg-yellow-100 rounded transition-colors"
                  aria-label="Fechar"
                >
                  <X className="w-4 h-4 text-yellow-600" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Indicador compacto de status de conexão (para header/navbar)
 */
export function ConnectionStatusIndicator() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    setIsOffline(isInOfflineMode());

    const unsubscribe = onStatusChange((isOnline) => {
      setIsOffline(!isOnline);
    });

    const interval = setInterval(() => {
      setIsOffline(isInOfflineMode());
    }, 10000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  if (!isOffline) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 rounded text-xs text-green-700">
        <Wifi className="w-3 h-3" />
        <span className="hidden sm:inline">Online</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 bg-yellow-50 rounded text-xs text-yellow-700">
      <WifiOff className="w-3 h-3" />
      <span className="hidden sm:inline">Offline</span>
    </div>
  );
}

/**
 * Banner inline para mostrar em páginas específicas
 */
export function OfflineModeAlert() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    setIsOffline(isInOfflineMode());
    
    const interval = setInterval(() => {
      setIsOffline(isInOfflineMode());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  if (!isOffline) {
    return null;
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-yellow-800 mb-1">
            Sistema em Modo Offline
          </h3>
          <p className="text-xs text-yellow-700 leading-relaxed">
            O sistema está funcionando com dados locais. Algumas funcionalidades podem estar limitadas. 
            Seus dados serão sincronizados automaticamente quando a conexão for restaurada.
          </p>
        </div>
      </div>
    </div>
  );
}