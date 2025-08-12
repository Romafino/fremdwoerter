/* Offline: HTML -> network-first (+ Fallback), JSON/Assets -> cache-first mit stillem Refresh */
const VERSION = 'v1.2.1';
const STATIC_CACHE = `static-${VERSION}`;
const ASSETS = [
  'index.html',
  'manifest.webmanifest',
  'fremdwoerter_klasse11_komplett.json'  // wichtig: damit die Wörter offline sind
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(STATIC_CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== STATIC_CACHE).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const accept = req.headers.get('accept') || '';
  const isHTML = accept.includes('text/html');

  // HTML: Network-first
  if (isHTML) {
    e.respondWith(
      fetch(req).then(res => {
        caches.open(STATIC_CACHE).then(c => c.put(req, res.clone()));
        return res;
      }).catch(() => caches.match(req).then(r => r || caches.match('index.html')))
    );
    return;
  }

  // JSON/sonstige Assets: Cache-first + Update im Hintergrund
  e.respondWith(
    caches.match(req).then(cached => {
      const fetchAndUpdate = fetch(req).then(res => {
        caches.open(STATIC_CACHE).then(c => c.put(req, res.clone()));
        return res;
      }).catch(() => cached);
      return cached || fetchAndUpdate;
    })
  );
});
