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
        // Si hay una nueva versión del SW esperando, activarla
        if (reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      })
      .catch((err) => {
        console.warn('No se pudo registrar el Service Worker:', err);
      });
  }, []);

  return null;
}
