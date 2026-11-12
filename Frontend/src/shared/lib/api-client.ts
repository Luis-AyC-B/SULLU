// src/shared/lib/api-client.ts
import axios from 'axios';
import { getSession, signOut } from 'next-auth/react';
import { toast } from 'sonner';
import { limpiarCacheOfflineEstudiante } from '@/features/portal/lib/offline-portal';

export const apiClient = axios.create({
  baseURL:
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    'http://localhost:3001',
});

apiClient.interceptors.request.use(async (config) => {
  if (
    typeof window !== 'undefined' &&
    window.location.hostname &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1' &&
    (!config.baseURL ||
      config.baseURL.includes('localhost') ||
      config.baseURL.includes('127.0.0.1'))
  ) {
    config.baseURL = `http://${window.location.hostname}:3001`;
  }

  const session = await getSession();
  if (session?.user?.accessToken) {
    config.headers.Authorization = `Bearer ${session.user.accessToken}`;
  }
  return config;
});

let isRedirecting = false;

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !isRedirecting) {
      isRedirecting = true;
      toast.error('Sesión inválida o iniciada en otro dispositivo.', {
        id: 'session-expired',
        duration: 4000,
      });

      // Retrasa el cierre de sesión 3 segundos para que el usuario pueda leer
      setTimeout(() => {
        limpiarCacheOfflineEstudiante();
        signOut({ callbackUrl: '/login' });
      }, 3000);
    }
    return Promise.reject(error);
  },
);
