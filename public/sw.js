const CACHE = 'queens-attendance-v1';
const ASSETS = ['/', '/index.html', '/css/style.css', '/js/db.js', '/js/app.js', '/js/sync.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // Network-first for API calls, cache-first for assets
  if (e.request.url.includes('/sync') || e.request.url.includes('/records') || e.request.url.includes('/export')) {
    e.respondWith(fetch(e.request).catch(() => new Response('{"error":"offline"}', { headers: { 'Content-Type': 'application/json' } })));
  } else {
    e.respondWith(caches.match(e.request).then(cached => cached || fetch(e.request)));
  }
});
