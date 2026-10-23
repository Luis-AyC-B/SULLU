/* Service worker del portal del estudiante (solo visualización offline).
 * Ubicación: Frontend/public/sw.js
 * Subir VERSION cada vez que se quiera invalidar la caché. */
const VERSION = 'v3';
const STATIC_CACHE = `portal-static-${VERSION}`;
const PAGES_CACHE = `portal-pages-${VERSION}`;
const IMAGES_CACHE = `portal-images-${VERSION}`;
const CACHES_VALIDAS = [STATIC_CACHE, PAGES_CACHE, IMAGES_CACHE];

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const claves = await caches.keys();
      await Promise.all(
        claves
          .filter((k) => k.startsWith('portal-') && !CACHES_VALIDAS.includes(k))
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

// JS, CSS y fuentes versionados por Next: nunca cambian bajo la misma URL
async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res && res.ok) cache.put(request, res.clone());
  return res;
}

// Páginas del portal: red primero, y si no hay red, la última copia guardada
async function networkFirst(request, fallbackUrl) {
  const cache = await caches.open(PAGES_CACHE);
  try {
    const res = await fetch(request);
    if (res && res.ok) cache.put(request, res.clone());
    return res;
  } catch {
    const hit =
      (await cache.match(request, { ignoreVary: true })) ||
      (fallbackUrl ? await cache.match(fallbackUrl, { ignoreVary: true }) : null);
    return hit || Response.error();
  }
}

// Fotos de perfil: muestra la copia guardada y la actualiza en segundo plano
async function staleWhileRevalidate(request) {
  const cache = await caches.open(IMAGES_CACHE);
  const hit = await cache.match(request);
  const red = fetch(request)
    .then((res) => {
      if (res && (res.ok || res.type === 'opaque')) cache.put(request, res.clone());
      return res;
    })
    .catch(() => null);
  return hit || (await red) || Response.error();
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const mismoOrigen = url.origin === self.location.origin;

  // Autenticación de Next: no se intercepta
  if (mismoOrigen && url.pathname.startsWith('/api/')) return;

  if (mismoOrigen && url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (request.destination === 'image' || url.pathname.startsWith('/uploads/')) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  const esNavegacion = request.mode === 'navigate';
  const esRsc = request.headers.get('RSC') === '1' || url.searchParams.has('_rsc');
  if (mismoOrigen && url.pathname.startsWith('/portal') && (esNavegacion || esRsc)) {
    event.respondWith(networkFirst(request, esNavegacion ? '/portal' : null));
  }
});