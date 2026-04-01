// PWA Utilities for MaisFrete

/**
 * Register the service worker
 */
export function registerServiceWorker(): void {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        console.log('✅ Service Worker registrado:', registration.scope);

        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('🔄 Nova versão disponível! Recarregue a página.');
                // You can show a toast here to inform the user
              }
            });
          }
        });
      } catch (error) {
        console.error('❌ Erro ao registrar Service Worker:', error);
      }
    });
  } else {
    console.log('⚠️ Service Workers não suportados neste navegador');
  }
}

/**
 * Unregister the service worker
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.ready;
    return registration.unregister();
  }
  return false;
}

/**
 * Check if the app is running as PWA
 */
export function isPWA(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

/**
 * Check if the app can be installed
 */
export function canInstall(): boolean {
  return 'BeforeInstallPromptEvent' in window;
}

/**
 * Install prompt interface
 */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;

/**
 * Setup install prompt
 */
export function setupInstallPrompt(
  onPromptReady: (canInstall: boolean) => void
): void {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    onPromptReady(true);
    console.log('📲 App pode ser instalado');
  });

  window.addEventListener('appinstalled', () => {
    console.log('✅ App instalado com sucesso');
    deferredPrompt = null;
    onPromptReady(false);
  });
}

/**
 * Show install prompt
 */
export async function showInstallPrompt(): Promise<boolean> {
  if (!deferredPrompt) {
    console.log('⚠️ Prompt de instalação não disponível');
    return false;
  }

  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  console.log(`📲 Resultado da instalação: ${outcome}`);

  deferredPrompt = null;
  return outcome === 'accepted';
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.log('⚠️ Notificações não suportadas');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    console.log(`🔔 Permissão de notificação: ${permission}`);
    return permission;
  }

  return Notification.permission;
}

/**
 * Show a notification
 */
export async function showNotification(
  title: string,
  options?: NotificationOptions
): Promise<void> {
  const permission = await requestNotificationPermission();

  if (permission === 'granted') {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        vibrate: [200, 100, 200],
        ...options,
      });
    } else {
      new Notification(title, {
        icon: '/icon-192.png',
        ...options,
      });
    }
  }
}

/**
 * Check network status
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Setup network status listeners
 */
export function setupNetworkListeners(
  onOnline: () => void,
  onOffline: () => void
): () => void {
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);

  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
}

/**
 * Get app info
 */
export function getAppInfo(): {
  isPWA: boolean;
  isOnline: boolean;
  canInstall: boolean;
  notificationPermission: NotificationPermission;
} {
  return {
    isPWA: isPWA(),
    isOnline: isOnline(),
    canInstall: canInstall(),
    notificationPermission: 'Notification' in window ? Notification.permission : 'denied',
  };
}
