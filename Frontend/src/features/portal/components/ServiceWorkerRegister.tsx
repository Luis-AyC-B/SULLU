'use client';

import { useEffect } from 'react';

/** Registra el service worker solo en producción (en dev cachearía chunks viejos). */
export function ServiceWorkerRegister() {
  useEffect(() => {
    console.log('SW register: NODE_ENV =', process.env.NODE_ENV);
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
      // Sin service worker el portal sigue funcionando, solo que sin modo offline
    });
  }, []);

  return null;
}
