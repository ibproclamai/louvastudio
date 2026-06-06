const CACHE = 'louva-studio-v6';
const SHELL = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/members.html',
  '/songs.html',
  '/schedules.html',
  '/my-schedule.html',
  '/studio.html',
  '/setup.html',
  '/multitrack.html',
  '/onboarding.html',
  '/relatorios.html',
  '/eventos.html',
  '/chat.html',
  '/manifest.json',
  '/icon.svg',
  '/css/style.css',
  '/css/studio.css',
  '/css/setup.css',
  '/css/multitrack.css',
  '/css/relatorios.css',
  '/css/eventos.css',
  '/css/chat.css',
  '/js/api.js',
  '/js/auth.js',
  '/js/members.js',
  '/js/songs.js',
  '/js/schedules.js',
  '/js/my-schedule.js',
  '/js/studio.js',
  '/js/multitrack.js',
  '/js/relatorios.js',
  '/js/setup.js',
  '/js/eventos.js',
  '/js/chat.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(
      fetch(e.request).catch(() => new Response(JSON.stringify({ error: 'offline' }), {
        status: 503, headers: { 'Content-Type': 'application/json' }
      }))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const fetchPromise = fetch(e.request).then((resp) => {
        if (resp.ok && (url.pathname.startsWith('/css/') || url.pathname.startsWith('/js/') || url.pathname.endsWith('.html') || url.pathname.endsWith('.svg'))) {
          const copy = resp.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return resp;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
