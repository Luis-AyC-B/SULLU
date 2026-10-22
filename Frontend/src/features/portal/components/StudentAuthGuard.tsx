'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { getMiPerfil } from '../api/student-profile.service';

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
    !!session?.user?.permisos?.some(
      (p) => p === PERMISO_PORTAL || p.startsWith(`${PERMISO_PORTAL}.`),
    );
  const [perfilListo, setPerfilListo] = useState(!requierePerfilCompleto);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    } else if (status === 'authenticated' && !allowed) {
      router.replace(`/unauthorized?modulo=${PERMISO_PORTAL}`);
    }
  }, [status, allowed, router]);

  useEffect(() => {
    if (!requierePerfilCompleto || status !== 'authenticated' || !allowed) return;

    let cancelado = false;
    getMiPerfil()
      .then((perfil) => {
        if (cancelado) return;
        if (perfil.perfilCompleto) setPerfilListo(true);
        else router.replace(RUTA_PERFIL);
      })
      .catch(() => {
        // Si no se puede consultar el perfil (red, o un usuario que no es estudiante), no se bloquea
        // la pantalla: cada vista muestra su propio error. El back debe validar el perfil por su cuenta.
        if (!cancelado) setPerfilListo(true);
      });

    return () => {
      cancelado = true;
    };
  }, [requierePerfilCompleto, status, allowed, router]);

  if (status !== 'authenticated' || !allowed || !perfilListo) return null;
  return <>{children}</>;
}
