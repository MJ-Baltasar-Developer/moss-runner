// Service worker: makes Moss Run work offline once it has been opened.
// sw-files.js (written by build.sh) lists every file and a version that changes with them;
// a new version installs a fresh cache and drops the old one.
importScripts('sw-files.js'); // defines self.MOSS_VERSION and self.MOSS_FILES
const CACHE = 'moss-run-' + self.MOSS_VERSION;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(self.MOSS_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('moss-run-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Cache first (it's all static), falling back to the network; pages fall back to the cached index.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    caches.match(req, { ignoreSearch: req.mode === 'navigate' }).then(hit => hit || fetch(req).catch(() =>
      req.mode === 'navigate' ? caches.match('./index.html') : Response.error())),
  );
});
