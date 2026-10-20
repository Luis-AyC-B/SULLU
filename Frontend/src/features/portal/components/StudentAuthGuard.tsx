'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

const PERMISO_PORTAL = 'portal_estudiante';

export function StudentAuthGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const user = session?.user as { rol?: string; permisos?: string[] } | undefined;
  const allowed =
    user?.rol === 'Estudiante' ||
    !!user?.permisos?.includes(PERMISO_PORTAL);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    } else if (status === 'authenticated' && !allowed) {
      router.replace(`/unauthorized?modulo=${PERMISO_PORTAL}`);
    }
  }, [status, allowed, router]);

  if (status !== 'authenticated' || !allowed) return null;
  return <>{children}</>;
}
