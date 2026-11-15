'use client';

import { useEffect } from 'react';

/**
 * Registra el Service Worker unificado (soporte offline para portal y módulos operador).
 * Se registra tanto en desarrollo como en producción para permitir pruebas locales.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    // En desarrollo local desregistrar service workers para evitar interferencias con Turbopack y HMR
    if (process.env.NODE_ENV === 'development') {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const reg of registrations) {
          reg.unregister();
        }
      });
      if ('caches' in window) {
        caches.keys().then((keys) => {
          for (const key of keys) {
            caches.delete(key);
          }
        });
      }
      return;
    }

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
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
