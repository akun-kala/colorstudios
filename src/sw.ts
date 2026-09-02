const CACHE_NAME = 'colorgrade-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/src/style.css',
  '/src/main.ts',
  '/manifest.json'
];

self.addEventListener('install', (e: any) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  (self as any).skipWaiting();
});

self.addEventListener('activate', (e: any) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
  );
  (self as any).clients.claim();
});

self.addEventListener('fetch', (e: any) => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
