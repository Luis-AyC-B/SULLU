"use client";

import { useSession } from "next-auth/react";
import { modules } from "@/shared/config/modules";
import type { Modulo } from "@/shared/types/modulo";

export function useUserPermissions(): Modulo[] {
  const { data: session } = useSession();
  const permisos = session?.user?.permisos as string[] | undefined;

  if (!permisos) return [];

  // Un módulo se muestra si el usuario tiene cualquier permiso de ese módulo
  return modules.filter((m) =>
    permisos.some((p) => p === m.clave || p.startsWith(`${m.clave}.`))
  );
}