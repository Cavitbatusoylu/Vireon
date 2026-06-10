// ============================================================
// Vireon Service Worker — Network-First Strategy
// Versiyon otomatik güncellenir, Ctrl+F5 sorununu çözer
// ============================================================
const CACHE_VERSION = Date.now();
const CACHE_NAME = `vireon-v${CACHE_VERSION}`;

// Sadece değişmeyecek asset'ler cache'lenir
const STATIC_ASSETS = [
  '/images/pwa/icon-192.png',
  '/images/pwa/icon-512.png',
  '/images/vireon-logo-transparent-new.png',
  '/images/vireon_robot.png',
  '/manifest.json'
];

// Bu dosyalar her zaman ağdan çekilir (cache-first KULLANILMAZ)
const NETWORK_FIRST = [
  '/',
  '/vireon.css',
  '/vireon.js'
];

self.addEventListener('install', event => {
  console.log('[SW] Installing v' + CACHE_VERSION);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching static assets only');
        return cache.addAll(STATIC_ASSETS);
      })
      .catch(err => console.error('[SW] Cache failed:', err))
  );
  // Eski service worker'ı hemen devre dışı bırak
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  console.log('[SW] Activating v' + CACHE_VERSION);
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => {
          console.log('[SW] Deleting old cache:', k);
          return caches.delete(k);
        })
      )
    )
  );
  // Tüm açık sekmeleri hemen kontrol altına al
  return self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // API isteklerini cache'leme — her zaman ağdan çek
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // HTML, JS, CSS → Network-First (ağ yoksa cache'den)
  const isNetworkFirst = NETWORK_FIRST.some(path => url.pathname === path) ||
                         url.pathname.endsWith('.html') ||
                         url.pathname.endsWith('.js') ||
                         url.pathname.endsWith('.css');

  if (isNetworkFirst) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Başarılı ağ yanıtını cache'le (yedek için)
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          // Ağ yoksa cache'den dene
          return caches.match(event.request).then(cached => {
            return cached || new Response('Offline - content not available', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
        })
    );
    return;
  }

  // Görseller ve diğer statik dosyalar → Cache-First (performans için)
  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        });
      })
      .catch(() => {
        return new Response('Offline', { status: 503 });
      })
  );
});
