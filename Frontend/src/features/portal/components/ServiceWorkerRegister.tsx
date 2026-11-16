'use client';

import { useEffect } from 'react';

/**
 * Registra el Service Worker unificado (soporte offline para portal y módulos operador).
 * Se registra tanto en desarrollo como en producción para permitir pruebas locales.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        if (reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        // Calentar caché offline de páginas de operador
        if (navigator.onLine) {
          const rutas = [
            '/control-ingreso',
            '/registro-ingresos',
            '/ingresos-rechazados',
          ];
          rutas.forEach((r) => {
            fetch(r, { cache: 'no-cache' }).catch(() => {});
            fetch(r, { headers: { RSC: '1' } }).catch(() => {});
          });
        }
      })
      .catch((err) => {
        console.warn('No se pudo registrar el Service Worker:', err);
      });
  }, []);

  return null;
}
