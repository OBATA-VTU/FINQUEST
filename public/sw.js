const CACHE_NAME = 'finsa-cache-v5';
const OFFLINE_URL = '/offline.html';

// We use relative paths or root paths. 
// Note: In some preview environments, resources might be cross-origin.
const ASSETS_TO_CACHE = [
  OFFLINE_URL,
  '/manifest.json',
  '/favicon.ico'
];

// Install Event: Cache critical assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Install');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching offline page');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate Event: Clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activate');
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event: Network First for HTML, Cache First for assets
self.addEventListener('fetch', (event) => {
  // Navigation requests (HTML pages) -> Network First, fall back to Offline Page
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match(OFFLINE_URL);
        })
    );
    return;
  }

  // Static Assets -> Cache First, fall back to Network
  if (
    event.request.destination === 'image' || 
    event.request.destination === 'style' || 
    event.request.destination === 'script' ||
    event.request.destination === 'font'
  ) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;

        return fetch(event.request).then((networkResponse) => {
          // Check response validity. Note: We allow opaque responses (type === 'opaque') 
          // for cross-origin images (like Unsplash/ImgBB) to be cached.
          if (!networkResponse || (networkResponse.status !== 200 && networkResponse.type !== 'opaque')) {
            return networkResponse;
          }

          // Clone response to cache
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            // We only cache get requests
            if (event.request.method === 'GET') {
                try {
                    cache.put(event.request, responseToCache);
                } catch(e) { console.warn('Cache put failed', e); }
            }
          });

          return networkResponse;
        }).catch(() => {
            // Return empty 200 response for missing images to prevent broken UI icons in offline mode
            if (event.request.destination === 'image') {
                 return new Response('<svg>...</svg>', { headers: { 'Content-Type': 'image/svg+xml' }});
            }
        });
      })
    );
  }
});

// Background Sync (Logic Placeholder for PWA Builder)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-messages') {
    console.log('[Service Worker] Background Sync Triggered');
  }
});

// Periodic Sync (Logic Placeholder for PWA Builder)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'get-latest-news') {
    console.log('[Service Worker] Periodic Sync Triggered');
  }
});

// Push Notifications (Logic Placeholder for PWA Builder)
self.addEventListener('push', (event) => {
  if (event.data) {
    console.log('[Service Worker] Push Received', event.data.text());
  }
});