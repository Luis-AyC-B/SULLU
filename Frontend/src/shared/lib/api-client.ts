// src/shared/lib/api-client.ts
import axios from 'axios';
import { getSession, signOut } from 'next-auth/react';
import { toast } from 'sonner';

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

apiClient.interceptors.request.use(async (config) => {
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
      
      // Retrasa el cierre de sesión 4 segundos para que el usuario pueda leer
      setTimeout(() => {
        signOut({ callbackUrl: '/login' });
      }, 3000);
    }
    return Promise.reject(error);
  }
);