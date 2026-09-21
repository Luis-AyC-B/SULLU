// src/shared/hooks/useHasPermission.ts
"use client";

import { useSession } from "next-auth/react";

interface SessionWithPermisos {
  permisos?: string[];
  user?: {
    permisos?: string[];
  };
}

export function useHasPermission(permiso: string): boolean {
  const { data: session } = useSession();
  const sessionObj = session as unknown as SessionWithPermisos | undefined;

  const permisos = sessionObj?.permisos || sessionObj?.user?.permisos;

  if (!permisos || !Array.isArray(permisos)) {
    return false;
  }

  return permisos.includes(permiso);
}