// src/shared/hooks/useHasPermission.ts
"use client";

import { useSession } from "next-auth/react";
import { useSyncExternalStore } from "react";
import { obtenerPermisosOffline } from "@/shared/lib/offline-auth";

function subscribeOfflinePermissions(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

export function useHasPermission(permiso: string): boolean {
  const { data: session } = useSession();
  const permisoOffline = useSyncExternalStore(
    subscribeOfflinePermissions,
    () => obtenerPermisosOffline().includes(permiso),
    () => false,
  );

  const permisosSession = session?.user?.permisos as string[] | undefined;
  if (permisosSession && permisosSession.length > 0) {
    return permisosSession.includes(permiso);
  }

  return permisoOffline;
}
