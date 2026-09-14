/* eslint-disable @typescript-eslint/no-explicit-any */
import { Session } from 'next-auth';

export function tienePermiso(session: Session | null, permiso: string): boolean {
  const permisos = (session as any)?.permisos as string[] | undefined;
  return !!permisos?.includes(permiso);
}