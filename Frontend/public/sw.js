/* Service worker unificado: portal del estudiante + módulos operador (offline).
 * Ubicación: Frontend/public/sw.js
 * Subir VERSION cada vez que se quiera invalidar la caché. */
const VERSION = 'v15';
const STATIC_CACHE   = `portal-static-${VERSION}`;
const PAGES_CACHE    = `portal-pages-${VERSION}`;
const RSC_CACHE      = `portal-rsc-${VERSION}`;
const IMAGES_CACHE   = `portal-images-${VERSION}`;
const OPERATOR_CACHE = `operator-pages-${VERSION}`;
const CACHES_VALIDAS = [STATIC_CACHE, PAGES_CACHE, RSC_CACHE, IMAGES_CACHE, OPERATOR_CACHE];

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(OPERATOR_CACHE);
        const rutas = [
          '/control-ingreso',
          '/registro-ingresos',
          '/ingresos-rechazados',
        ];
        await Promise.all(
          rutas.map(async (ruta) => {
            try {
              const res = await fetch(ruta);
              const ct = res.headers.get('content-type') || '';
              if (res && res.ok && ct.includes('text/html')) {
                await cache.put(ruta, res);
              }
            } catch {
              // Silencioso por ruta si redirige a login durante el install
            }
          })
        );
      } catch {
        // En caso de que el almacenamiento no esté disponible
      }
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const claves = await caches.keys();
      await Promise.all(
        claves
          .filter((k) => !CACHES_VALIDAS.includes(k))
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

// JS, CSS y fuentes versionados por Next: nunca cambian bajo la misma URL
async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const hit = await cache.match(request, { ignoreVary: true });
  if (hit) return hit;
  const res = await fetch(request);
  if (res && res.ok) cache.put(request, res.clone());
  return res;
}

// Navegación de páginas HTML completas (F5, recarga o navegación directa de URL)
async function navigationNetworkFirst(request, cacheName, fallbackUrl) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(request);
    // CRÍTICO: Asegurar que solo se almacenen respuestas HTML genuinas.
    // Nunca guardar respuestas RSC (text/x-component, texto plano de streaming) en la caché de navegación.
    const contentType = res.headers.get('content-type') || '';
    if (res && res.ok && contentType.includes('text/html')) {
      cache.put(request, res.clone());
      const url = new URL(request.url);
      if (url.pathname === '/control-ingreso') {
        cache.put('/control-ingreso', res.clone());
      }
    }
    return res;
  } catch {
    let hit = await cache.match(request, { ignoreVary: true });
    if (!hit && fallbackUrl) {
      hit = await cache.match(fallbackUrl, { ignoreVary: true });
    }
    if (!hit && cacheName === OPERATOR_CACHE) {
      hit = await cache.match('/control-ingreso', { ignoreVary: true });
    }
    return hit || Response.error();
  }
}

// Componentes y datos RSC: se almacenan en una caché separada (RSC_CACHE) para NUNCA pisar las páginas HTML
async function rscNetworkFirst(request) {
  const cache = await caches.open(RSC_CACHE);
  try {
    const res = await fetch(request);
    if (res && res.ok) {
      cache.put(request, res.clone());
    }
    return res;
  } catch {
    const hit = await cache.match(request, { ignoreVary: true });
    return hit || Response.error();
  }
}

// Next.js chunks y assets estáticos: Network-first con fallback a caché
async function staticNetworkFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  try {
    const res = await fetch(request);
    if (res && res.ok) cache.put(request, res.clone());
    return res;
  } catch {
    const hit = await cache.match(request, { ignoreVary: true });
    return hit || Response.error();
  }
}

// Fotos de perfil: muestra la copia guardada y la actualiza en segundo plano
async function staleWhileRevalidate(request) {
  const cache = await caches.open(IMAGES_CACHE);
  const hit = await cache.match(request, { ignoreVary: true });
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

  // QRs de prueba y dashboard de testing: NO interceptar ni cachear
  if (url.pathname.startsWith('/qrs_offline/') || url.pathname.includes('qrs-offline')) return;

  // Next.js chunks y assets estáticos
  if (mismoOrigen && url.pathname.startsWith('/_next/static/')) {
    if (url.pathname.includes('hot-update')) return;
    event.respondWith(staticNetworkFirst(request));
    return;
  }

  // Imágenes y fotos de perfil
  if (request.destination === 'image' || url.pathname.startsWith('/uploads/')) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  const esNavegacion = request.mode === 'navigate';
  const esRsc = request.headers.get('RSC') === '1' || url.searchParams.has('_rsc');

  // Si es una petición RSC (datos de componentes en navegación cliente Next.js)
  if (esRsc) {
    event.respondWith(rscNetworkFirst(request));
    return;
  }

  // Módulos del operador: navegación de páginas HTML
  const RUTAS_OPERADOR = [
    '/control-ingreso',
    '/registro-ingresos',
    '/ingresos-rechazados',
    '/ingresos',
    '/incidencias',
  ];
  const esRutaOperador =
    mismoOrigen && RUTAS_OPERADOR.some((r) => url.pathname.startsWith(r));

  if (esRutaOperador && esNavegacion) {
    const fallback = '/' + url.pathname.split('/').filter(Boolean)[0];
    event.respondWith(navigationNetworkFirst(request, OPERATOR_CACHE, fallback));
    return;
  }

  // Portal del estudiante: navegación de páginas HTML
  if (mismoOrigen && url.pathname.startsWith('/portal') && esNavegacion) {
    event.respondWith(
      navigationNetworkFirst(request, PAGES_CACHE, '/portal'),
    );
  }
});
