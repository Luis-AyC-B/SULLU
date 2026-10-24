'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { getMiPerfil } from '../api/student-profile.service';
import {
  guardarUsuarioOffline,
  haySesionPortalOffline,
  marcarSesionPortal,
} from '../lib/offline-portal';
import { obtenerUsuarioOperadorOffline } from '@/shared/lib/offline-auth';

const PERMISO_PORTAL = 'portal_estudiante';
const RUTA_PERFIL = '/portal/perfil';

interface StudentAuthGuardProps {
  children: React.ReactNode;
  /**
   * Si es true (por defecto), el estudiante con el perfil incompleto es enviado a la pantalla
   * de configuración. Esa misma pantalla lo desactiva para no entrar en un ciclo de redirecciones.
   */
  requierePerfilCompleto?: boolean;
}

export function StudentAuthGuard({ children, requierePerfilCompleto = true }: StudentAuthGuardProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const allowed =
    session?.user?.rol === 'Estudiante' ||
    session?.user?.rol === 'Control' ||
    !!session?.user?.permisos?.some(
      (p) => p === PERMISO_PORTAL || p.startsWith(`${PERMISO_PORTAL}.`),
    );
  const [perfilListo, setPerfilListo] = useState(!requierePerfilCompleto);

  // Inicializar estado offline inmediatamente desde navigator.onLine para evitar race-condition en mount
  const [online, setOnline] = useState(() => {
    if (typeof navigator !== 'undefined') {
      return navigator.onLine;
    }
    return true;
  });

  useEffect(() => {
    const alVolver = () => setOnline(true);
    const alPerder = () => setOnline(false);
    window.addEventListener('online', alVolver);
    window.addEventListener('offline', alPerder);
    return () => {
      window.removeEventListener('online', alVolver);
      window.removeEventListener('offline', alPerder);
    };
  }, []);

  // Sin red: nunca enviar a /login (el servidor no responderá y dará dinosaurio)
  const sinRed = !online || (typeof navigator !== 'undefined' && !navigator.onLine);
  const sesionOffline =
    sinRed ||
    (status !== 'authenticated' &&
      (haySesionPortalOffline() || obtenerUsuarioOperadorOffline() !== null));

  // Recordar que este dispositivo tuvo una sesión válida
  useEffect(() => {
    if (status === 'authenticated' && allowed) {
      marcarSesionPortal();
      guardarUsuarioOffline({
        nombre: session?.user?.name ?? '',
        rol: session?.user?.rol ?? 'Estudiante',
      });
    }
  }, [status, allowed, session]);

  useEffect(() => {
    // Si no hay red, NUNCA redirigir a /login
    if (sinRed || sesionOffline) return;

    if (status === 'unauthenticated') {
      router.replace('/login');
    } else if (status === 'authenticated' && !allowed) {
      router.replace(`/unauthorized?modulo=${PERMISO_PORTAL}`);
    }
  }, [status, allowed, router, sesionOffline, sinRed]);

  useEffect(() => {
    if (!requierePerfilCompleto || status !== 'authenticated' || !allowed) return;
    if (sinRed) {
      setPerfilListo(true);
      return;
    }

    let cancelado = false;
    getMiPerfil()
      .then((perfil) => {
        if (cancelado) return;
        if (perfil.perfilCompleto) setPerfilListo(true);
        else router.replace(RUTA_PERFIL);
      })
      .catch(() => {
        if (!cancelado) setPerfilListo(true);
      });

    return () => {
      cancelado = true;
    };
  }, [requierePerfilCompleto, status, allowed, router, sinRed]);

  // Si está offline, permitir acceso inmediato a la vista offline
  if (sinRed || sesionOffline) return <>{children}</>;
  if (status !== 'authenticated' || !allowed || !perfilListo) return null;
  return <>{children}</>;
}
