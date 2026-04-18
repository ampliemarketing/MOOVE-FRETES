/**
 * Modo Offline - Sistema de fallback quando Supabase não está disponível
 * 
 * Permite que o sistema funcione completamente offline usando apenas LocalStorage
 * até que o Supabase esteja configurado e acessível.
 */

import { supabase } from './supabase/client';

let isSupabaseAvailable: boolean | null = null;
let lastCheck = 0;
const CHECK_INTERVAL = 30000; // Verificar a cada 30 segundos (reduzido de 60s)

// Event listeners para notificar mudanças de status
type StatusChangeListener = (isOnline: boolean) => void;
const statusListeners: Set<StatusChangeListener> = new Set();

/**
 * Adiciona listener para mudanças de status
 */
export function onStatusChange(listener: StatusChangeListener) {
  statusListeners.add(listener);
  return () => statusListeners.delete(listener);
}

/**
 * Notifica todos os listeners sobre mudança de status
 */
function notifyStatusChange(isOnline: boolean) {
  statusListeners.forEach(listener => {
    try {
      listener(isOnline);
    } catch (error) {
      console.error('Error in status listener:', error);
    }
  });
}

/**
 * Verifica se o Supabase está disponível (com cache)
 */
export async function checkSupabaseAvailability(): Promise<boolean> {
  const now = Date.now();
  
  // Usar cache se a última verificação foi há menos de 30 segundos
  if (isSupabaseAvailable !== null && (now - lastCheck) < CHECK_INTERVAL) {
    return isSupabaseAvailable;
  }
  
  try {
    // Verificação silenciosa - sem logs desnecessários
    
    // Timeout de 3 segundos para verificação (reduzido de 5s)
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Timeout')), 3000);
    });
    
    const checkPromise = supabase
      .from('profiles')
      .select('count')
      .limit(1)
      .then(({ error }) => !error);
    
    const result = await Promise.race([checkPromise, timeoutPromise]);
    
    const previousStatus = isSupabaseAvailable;
    isSupabaseAvailable = result;
    lastCheck = now;
    
    if (isSupabaseAvailable) {
      // Apenas log quando houver mudança de status
      if (previousStatus === false) {
        notifyStatusChange(true);
      }
    } else {
      if (previousStatus === true) {
        notifyStatusChange(false);
      }
    }
    
    return isSupabaseAvailable;
  } catch (error) {
    // Silenciar erros de timeout - é normal quando Supabase não está configurado
    const previousStatus = isSupabaseAvailable;
    isSupabaseAvailable = false;
    lastCheck = now;
    
    // Apenas notificar na primeira vez ou quando status mudar
    if (previousStatus === true) {
      notifyStatusChange(false);
    }
    
    return false;
  }
}

/**
 * Força uma nova verificação do Supabase (ignora cache)
 */
export async function recheckSupabaseAvailability(): Promise<boolean> {
  isSupabaseAvailable = null;
  lastCheck = 0;
  return checkSupabaseAvailability();
}

/**
 * Retorna o status em cache do Supabase (sem fazer nova verificação)
 */
export function getSupabaseCachedStatus(): boolean | null {
  return isSupabaseAvailable;
}

/**
 * Verifica se deve tentar usar o Supabase
 */
export function shouldUseSupabase(): boolean {
  // Se já sabemos que não está disponível, não tentar
  if (isSupabaseAvailable === false) {
    return false;
  }
  
  // Se nunca verificamos ou cache expirou, assumir que pode estar disponível
  return true;
}

/**
 * Executa operação com fallback offline
 */
export async function withOfflineFallback<T>(
  operation: () => Promise<T>,
  fallback: () => T,
  operationName: string = 'Operação'
): Promise<T> {
  // Se sabemos que Supabase não está disponível, usar fallback direto
  if (isSupabaseAvailable === false) {
    return fallback();
  }
  
  try {
    // Timeout de 8 segundos
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Timeout')), 8000);
    });
    
    const result = await Promise.race([operation(), timeoutPromise]);
    
    // Se chegou aqui, Supabase está funcionando
    if (isSupabaseAvailable === null || isSupabaseAvailable === false) {
      isSupabaseAvailable = true;
      lastCheck = Date.now();
    }
    
    return result;
  } catch (error) {
    
    // Marcar Supabase como indisponível
    isSupabaseAvailable = false;
    lastCheck = Date.now();
    
    return fallback();
  }
}

/**
 * Modo Offline Status para UI
 */
export interface OfflineStatus {
  isOffline: boolean;
  lastCheck: Date | null;
  canRetry: boolean;
}

export function getOfflineStatus(): OfflineStatus {
  return {
    isOffline: isSupabaseAvailable === false,
    lastCheck: lastCheck > 0 ? new Date(lastCheck) : null,
    canRetry: !lastCheck || (Date.now() - lastCheck) >= CHECK_INTERVAL,
  };
}

/**
 * Banner de Modo Offline para mostrar ao usuário
 */
export function isInOfflineMode(): boolean {
  return isSupabaseAvailable === false;
}

/**
 * Mensagem amigável sobre o modo offline
 */
export function getOfflineMessage(): string {
  if (isSupabaseAvailable === false) {
    return 'Sistema em modo offline. Seus dados serão salvos localmente e sincronizados quando a conexão for restaurada.';
  }
  return '';
}

/**
 * Monitora continuamente a disponibilidade do Supabase
 */
let monitoringInterval: NodeJS.Timeout | null = null;

export function startSupabaseMonitoring() {
  if (monitoringInterval) return;
  
  // Verificar imediatamente
  checkSupabaseAvailability();
  
  // Verificar a cada 30 segundos
  monitoringInterval = setInterval(() => {
    checkSupabaseAvailability();
  }, CHECK_INTERVAL);
}

export function stopSupabaseMonitoring() {
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
    monitoringInterval = null;
  }
}

/**
 * Monitor de conectividade de rede
 */
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    recheckSupabaseAvailability();
  });
  
  window.addEventListener('offline', () => {
    const previousStatus = isSupabaseAvailable;
    isSupabaseAvailable = false;
    if (previousStatus === true) {
      notifyStatusChange(false);
    }
  });
}

// Verificar disponibilidade ao inicializar o módulo
if (typeof window !== 'undefined') {
  // Verificar após 2 segundos (dar tempo para o app inicializar)
  setTimeout(() => {
    checkSupabaseAvailability().catch(() => {
      // Ignorar erro na verificação inicial
    });
  }, 2000);
}
