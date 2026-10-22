/* Sauce Counter service worker.
 *
 * Deliberately network-first: the app always tries the internet, and only
 * falls back to the cached copy when the store's wifi drops out. That means a
 * new version reaches everyone the moment it's deployed — a cache-first worker
 * can pin people to an old build for days, which is worse than being briefly
 * offline.
 *
 * Only same-origin GET requests are touched. Anything going to the Google Sheet
 * passes straight through untouched, so counts are never served from a stale
 * cache.
 *
 * THE WHITE SCREEN THIS FILE USED TO CAUSE
 *
 * Vite gives every build's JavaScript a new filename, and index.html is the
 * only thing that knows which. GitHub Pages drops the old files when a new
 * build goes up. So a cached index.html and a live network are a bad pair: the
 * page asks for the script it remembers, the server says 404, and a 404 is a
 * perfectly successful HTTP response — nothing throws, no fallback runs, the
 * app's only script never loads and the page is blank. No error, no message,
 * and it persists until index.html is fetched fresh.
 *
 * Two things above conspired to make that likely. The shell was cached during
 * `install`, which happens once, ever — so the copy kept for offline use was
 * frozen at whatever build first ran on that device, months of deploys ago.
 * And the fallback only ran on a thrown fetch, so it never covered a 404.
 *
 * Both are fixed below, and the cache name is bumped so every device throws
 * away the shell it has been hoarding.
 */

const CACHE = 'cfa-counter-v2';

/* Every path is relative to this file, because the site lives in a folder on
 * GitHub Pages (/Condiment-Sauce-Counter-West-Adams-CFA/) rather than at the
 * root of its own address. A "/" here would point at github.io itself. */
const SHELL_PAGE = new URL('./index.html', self.location).href;

const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then(async (response) => {
        if (response.ok) {
          // Tuck a fresh copy away for the next time the wifi misbehaves.
          const copy = response.clone();
          void caches.open(CACHE).then((cache) => cache.put(request, copy));

          // Every page load also refreshes the offline shell, so the copy kept
          // for a wifi outage names this build's script rather than one from
          // whenever this iPad was first set up.
          if (request.mode === 'navigate') {
            const shell = response.clone();
            void caches.open(CACHE).then((cache) => cache.put(SHELL_PAGE, shell));
          }

          return response;
        }

        // Not OK — and after a deploy that most likely means this is an old
        // build asking for a file that has since been replaced. The cached
        // copy still runs, so serve it rather than handing back a 404 that
        // would leave the page blank. Cleared on the next successful load.
        const cached = await caches.match(request);
        if (cached) return cached;

        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;

        // An unvisited page while offline still gets the app shell, which can
        // render the rest from its own cache.
        if (request.mode === 'navigate') {
          const shell = await caches.match(SHELL_PAGE);
          if (shell) return shell;
        }
        return Response.error();
      }),
  );
});
