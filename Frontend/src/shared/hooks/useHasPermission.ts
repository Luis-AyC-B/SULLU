// src/shared/hooks/useHasPermission.ts
"use client";

import { useSession } from "next-auth/react";
import { obtenerPermisosOffline } from "@/shared/lib/offline-auth";

export function useHasPermission(permiso: string): boolean {
  const { data: session, status } = useSession();

  const permisosSession = session?.user?.permisos as string[] | undefined;
  if (permisosSession && permisosSession.length > 0) {
    return permisosSession.includes(permiso);
  }

  // Fallback offline cuando el navegador no puede validar la sesión contra el servidor
  const offlinePermisos = obtenerPermisosOffline();
  return offlinePermisos.includes(permiso);
}
