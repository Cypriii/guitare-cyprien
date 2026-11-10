/* Service worker : met l'application en cache pour un fonctionnement hors connexion.
 * Change VERSION à chaque mise à jour des fichiers pour forcer le rafraîchissement. */
const VERSION = 'guitare-v7';
const FILES = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './data/chords.js',
  './data/exercises.js',
  './manifest.json',
  './icons/icon-180.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Cache d'abord (démarrage instantané, hors connexion), mise à jour en arrière-plan.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
          return res;
        })
        .catch(() => cached || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error()));
      return cached || network;
    })
  );
});
