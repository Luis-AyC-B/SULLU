/* Service worker unificado: portal del estudiante + módulos operador (offline).
 * Ubicación: Frontend/public/sw.js
 * Subir VERSION cada vez que se quiera invalidar la caché. */
const VERSION = 'v18';
const STATIC_CACHE   = `portal-static-stable`;
const PAGES_CACHE    = `portal-pages-${VERSION}`;
const RSC_CACHE      = `portal-rsc-stable`;
const IMAGES_CACHE   = `portal-images-stable`;
const OPERATOR_CACHE = `operator-pages-stable`;
const CACHES_VALIDAS = [STATIC_CACHE, PAGES_CACHE, RSC_CACHE, IMAGES_CACHE, OPERATOR_CACHE];

const PRESERVED_PREFIXES = ['portal-static', 'portal-images', 'operator-pages', 'portal-rsc'];

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
          '/control-ingreso/escanear',
          '/registro-ingresos',
          '/ingresos',
          '/ingresos-rechazados',
        ];
        await Promise.all(
          rutas.map(async (ruta) => {
            try {
              const res = await fetch(ruta, { headers: { Accept: 'text/html' } });
              const ct = res.headers.get('content-type') || '';
              if (res && res.ok && ct.includes('text/html')) {
                await cache.put(ruta, res.clone());
                await cache.put(new URL(ruta, self.location.origin).href, res);
              }
            } catch {
              // Silencioso por ruta si redirige a login durante el install
            }
          })
        );

        // Precarga proactiva inmediata de las fotografías de estudiantes para visualización offline
        const imgCache = await caches.open(IMAGES_CACHE);
        const fotos = [
          '/uploads/estudiantes/foto_202401001.jpg',
          '/uploads/estudiantes/foto_202401002.jpg',
          '/uploads/estudiantes/foto_202401003.jpg',
          '/uploads/estudiantes/foto_202401004.jpg',
          '/uploads/estudiantes/foto_202401005.jpg',
          '/uploads/estudiantes/foto_202401006.jpg',
          '/uploads/estudiantes/foto_202401007.jpg',
          '/uploads/estudiantes/foto_202401008.jpg',
          '/uploads/estudiantes/foto_202401009.jpg',
          '/uploads/estudiantes/foto_202401010.jpg',
          '/uploads/estudiantes/foto_202401011.jpg',
          '/uploads/estudiantes/foto_202401099.jpg',
        ];
        await Promise.all(
          fotos.map(async (foto) => {
            try {
              const res = await fetch(foto);
              if (res && res.ok) {
                await imgCache.put(foto, res.clone());
                await imgCache.put(new URL(foto, self.location.origin).href, res.clone());
                await imgCache.put(`http://localhost:6002${foto}`, res);
              }
            } catch {}
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
          .filter(
            (k) =>
              !CACHES_VALIDAS.includes(k) &&
              !PRESERVED_PREFIXES.some((prefix) => k.startsWith(prefix))
          )
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

// JS, CSS y fuentes versionados por Next: nunca cambian bajo la misma URL
async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  let hit = await cache.match(request, { ignoreVary: true });
  if (!hit) {
    hit = await caches.match(request, { ignoreVary: true });
  }
  if (hit) return hit;
  const res = await fetch(request);
  if (res && res.ok) cache.put(request, res.clone());
  return res;
}

// Navegación de páginas HTML completas (F5, recarga o navegación directa de URL)
async function navigationNetworkFirst(request, cacheName, fallbackUrl) {
  const cache = await caches.open(cacheName);
  const url = new URL(request.url);

  try {
    const res = await fetch(request);
    // CRÍTICO: Asegurar que solo se almacenen respuestas HTML genuinas.
    // Nunca guardar respuestas RSC (text/x-component, texto plano de streaming) en la caché de navegación.
    const contentType = res.headers.get('content-type') || '';
    if (res && res.ok && contentType.includes('text/html')) {
      cache.put(request, res.clone());
      cache.put(url.pathname, res.clone());
      if (url.pathname === '/control-ingreso') {
        cache.put('/control-ingreso', res.clone());
      }
    }
    return res;
  } catch {
    let hit =
      (await cache.match(request, { ignoreVary: true })) ||
      (await cache.match(url.pathname, { ignoreVary: true }));

    if (!hit && fallbackUrl) {
      hit =
        (await cache.match(fallbackUrl, { ignoreVary: true })) ||
        (await cache.match(new URL(fallbackUrl, request.url).href, { ignoreVary: true }));
    }

    if (!hit && cacheName === OPERATOR_CACHE) {
      // Fallback cruzado inteligente entre páginas del operador para evitar ERR_FAILED
      hit =
        (await cache.match('/control-ingreso', { ignoreVary: true })) ||
        (await cache.match('/ingresos', { ignoreVary: true })) ||
        (await cache.match('/ingresos-rechazados', { ignoreVary: true })) ||
        (await cache.match('/registro-ingresos', { ignoreVary: true }));
    }

    if (!hit) {
      hit = await caches.match(request, { ignoreVary: true });
    }
    if (!hit) {
      hit = await caches.match(url.pathname, { ignoreVary: true });
    }

    return hit || Response.error();
  }
}

// Componentes y datos RSC: se almacenan en una caché separada (RSC_CACHE) para NUNCA pisar las páginas HTML
async function rscNetworkFirst(request) {
  const cache = await caches.open(RSC_CACHE);
  const url = new URL(request.url);

  try {
    const res = await fetch(request);
    if (res && res.ok) {
      cache.put(request, res.clone());
      cache.put(url.pathname + url.search, res.clone());
    }
    return res;
  } catch {
    let hit =
      (await cache.match(request, { ignoreVary: true })) ||
      (await cache.match(url.pathname + url.search, { ignoreVary: true })) ||
      (await cache.match(url.pathname, { ignoreVary: true }));

    if (!hit) {
      hit = await caches.match(request, { ignoreVary: true });
    }
    return hit || Response.error();
  }
}

// Next.js chunks y assets estáticos: Network-first con fallback a caché persistente
async function staticNetworkFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  try {
    const res = await fetch(request);
    if (res && res.ok) cache.put(request, res.clone());
    return res;
  } catch {
    let hit = await cache.match(request, { ignoreVary: true });
    if (!hit) {
      hit = await caches.match(request, { ignoreVary: true });
    }
    return hit || Response.error();
  }
}

// Fotos de perfil: muestra la copia guardada y la actualiza en segundo plano
async function staleWhileRevalidate(request) {
  const cache = await caches.open(IMAGES_CACHE);
  const url = new URL(request.url);

  let hit =
    (await cache.match(request, { ignoreVary: true })) ||
    (await cache.match(url.pathname, { ignoreVary: true })) ||
    (await cache.match(new URL(url.pathname, self.location.origin).href, { ignoreVary: true })) ||
    (await cache.match(`http://localhost:6002${url.pathname}`, { ignoreVary: true }));

  if (!hit) {
    hit =
      (await caches.match(request, { ignoreVary: true })) ||
      (await caches.match(url.pathname, { ignoreVary: true })) ||
      (await caches.match(new URL(url.pathname, self.location.origin).href, { ignoreVary: true }));
  }

  const red = fetch(request)
    .then(async (res) => {
      if (res && (res.ok || res.type === 'opaque')) {
        await cache.put(request, res.clone());
        await cache.put(url.pathname, res.clone());
        await cache.put(new URL(url.pathname, self.location.origin).href, res.clone());
        await cache.put(`http://localhost:6002${url.pathname}`, res.clone());
      }
      return res;
    })
    .catch(async () => {
      // Fallback local desde frontend origin http://localhost:4000/uploads/...
      if (url.pathname.startsWith('/uploads/')) {
        try {
          const localUrl = new URL(url.pathname, self.location.origin).href;
          const fallbackRes = await fetch(localUrl);
          if (fallbackRes && fallbackRes.ok) {
            cache.put(request, fallbackRes.clone());
            cache.put(url.pathname, fallbackRes.clone());
            return fallbackRes;
          }
        } catch {}
      }
      return null;
    });

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

  // Imágenes y fotos de perfil (tanto del frontend como del backend /uploads/)
  if (
    request.destination === 'image' ||
    url.pathname.startsWith('/uploads/') ||
    /\.(jpe?g|png|webp|gif|svg|ico)$/i.test(url.pathname)
  ) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  const esNavegacion = request.mode === 'navigate';
  const esRsc = request.headers.get('RSC') === '1' || url.searchParams.has('_rsc');
  const esHtml =
    request.headers.get('accept')?.includes('text/html') ||
    request.destination === 'document';

  // Si es una petición RSC (datos de componentes en navegación cliente Next.js)
  if (esRsc) {
    event.respondWith(rscNetworkFirst(request));
    return;
  }

  // Módulos del operador: navegación de páginas HTML o prefetch de documentos HTML
  const RUTAS_OPERADOR = [
    '/control-ingreso',
    '/registro-ingresos',
    '/ingresos-rechazados',
    '/ingresos',
    '/incidencias',
  ];
  const esRutaOperador =
    mismoOrigen && RUTAS_OPERADOR.some((r) => url.pathname.startsWith(r));

  if (esRutaOperador && (esNavegacion || esHtml)) {
    const fallback = '/' + url.pathname.split('/').filter(Boolean)[0];
    event.respondWith(navigationNetworkFirst(request, OPERATOR_CACHE, fallback));
    return;
  }

  // Portal del estudiante: navegación de páginas HTML
  if (mismoOrigen && url.pathname.startsWith('/portal') && (esNavegacion || esHtml)) {
    event.respondWith(
      navigationNetworkFirst(request, PAGES_CACHE, '/portal'),
    );
  }
});
