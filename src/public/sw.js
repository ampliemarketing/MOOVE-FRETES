// MaisFrete Service Worker
// Version 1.0.0

const CACHE_NAME = 'maisfrete-v1';
const RUNTIME_CACHE = 'maisfrete-runtime';

// Assets to cache on install
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/styles/globals.css',
  '/manifest.json',
];

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Skip chrome extension requests
  if (event.request.url.startsWith('chrome-extension://')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        // Clone the request
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then((response) => {
          // Check if valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          // Cache runtime requests
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return response;
        }).catch((error) => {
          
          // Return offline page if available
          return caches.match('/offline.html').then((offlineResponse) => {
            return offlineResponse || new Response('Offline', {
              status: 503,
              statusText: 'Service Unavailable',
            });
          });
        });
      })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'MaisFrete';
  const options = {
    body: data.body || 'Nova notificação',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    data: data.data || {},
    actions: data.actions || [],
    tag: data.tag || 'maisfrete-notification',
    requireInteraction: data.requireInteraction || false,
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing window if available
      for (let client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Open new window
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

// Helper function to sync data
async function syncData() {
  
  try {
    // Get pending actions from IndexedDB or localStorage
    const pendingActions = JSON.parse(localStorage.getItem('maisfrete_pending_actions') || '[]');
    
    if (pendingActions.length === 0) {
      return;
    }

    // Process pending actions
    for (const action of pendingActions) {
      // Here you would send the action to your backend
      // For demo mode, we just log it
    }

    // Clear pending actions
    localStorage.setItem('maisfrete_pending_actions', '[]');
  } catch (error) {
    console.error('[SW] Sync failed:', error);
    throw error;
  }
}

