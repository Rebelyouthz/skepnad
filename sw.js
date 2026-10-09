// Skepnads service worker: gör appen installerbar och snabb att starta.
// Sidan hämtas alltid färsk när nätet finns (så uppdateringar syns direkt);
// tunga filer (AI-modeller, wasm, typsnitt, bundlar) cachas efter första hämtningen.
const CACHE = 'skepnad-v2';
const HEAVY = /\.(task|tflite|wasm|woff2?|js|css|png|svg|ico|webmanifest)$/;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin || url.pathname.includes('/api/')) return;
  if (req.mode === 'navigate' || !HEAVY.test(url.pathname)) {
    // nätet först, cache som reserv (offline)
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          if (res.ok) caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req)),
    );
    return;
  }
  // cache först för tunga filer
  e.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          const copy = res.clone();
          if (res.ok) caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        }),
    ),
  );
});
