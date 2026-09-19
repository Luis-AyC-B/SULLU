// src/shared/hooks/useHasPermission.ts
"use client";

import { useSession } from "next-auth/react";

export function useHasPermission(permiso: string): boolean {
  const { data: session } = useSession();
  const permisos = session?.permisos as string[] | undefined;

  // Mientras no haya sesión/permisos reales (backend no listo): permitir todo,
  // igual que useUserPermissions. Cuando el login entregue permisos reales,
  // este fallback deja de aplicar automáticamente.
  if (!permisos) return true;

  return permisos.includes(permiso);
}