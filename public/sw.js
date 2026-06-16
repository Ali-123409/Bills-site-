const CACHE = 'pakistanbill-v2';
const PRECACHE = [
  '/', '/lesco-bill/', '/mepco-bill/', '/gepco-bill/', '/fesco-bill/',
  '/iesco-bill/', '/pesco-bill/', '/hesco-bill/', '/sepco-bill/',
  '/qesco-bill/', '/tesco-bill/', '/ajk-bill/', '/k-electric-bill/',
  '/sngpl-bill/', '/ssgc-bill/', '/ptcl-bill/', '/wasa-lahore-bill/',
  '/electricity-bill-calculator/', '/blog/', '/styles/global.css'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // Network-first for API calls, cache-first for pages
  if (e.request.url.includes('/api/')) {
    e.respondWith(fetch(e.request).catch(() => new Response('{"error":"offline"}', {headers:{'Content-Type':'application/json'}})));
    return;
  }
  e.respondWith(
    fetch(e.request)
      .then(r => { const c = r.clone(); caches.open(CACHE).then(cache => cache.put(e.request, c)); return r; })
      .catch(() => caches.match(e.request))
  );
});
