const CACHE_NAME = 'nexusnet-cache-v2';

self.addEventListener('install', (event) => {
  const scope = self.registration.scope;
  const assets = [
    scope,
    new URL('index.html', scope).toString(),
    new URL('manifest.webmanifest', scope).toString(),
    new URL('icon.svg', scope).toString(),
    new URL('icon-192.png', scope).toString(),
    new URL('icon-512.png', scope).toString()
  ];

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(assets).catch((err) => {
        console.log('Precache fallback:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request)
        .then((networkResponse) => {
          return networkResponse;
        })
        .catch(() => {
          return cachedResponse;
        });
    })
  );
});
