"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { modules } from "@/shared/config/modules";
import type { Modulo } from "@/shared/types/modulo";
import { haySesionPortalOffline } from "@/features/portal/lib/offline-portal";

export function useUserPermissions(): Modulo[] {
  const { data: session } = useSession();
  const [sesionOffline, setSesionOffline] = useState(false);

  useEffect(() => {
    setSesionOffline(haySesionPortalOffline());
  }, []);

  const permisos = session?.user?.permisos as string[] | undefined;

  if (!permisos) {
    if (!sesionOffline) return [];
    return modules.filter((m) => m.clave === "portal_estudiante");
  }

  // Un módulo se muestra si el usuario tiene cualquier permiso de ese módulo
  return modules.filter((m) =>
    permisos.some((p) => p === m.clave || p.startsWith(`${m.clave}.`))
  );
}