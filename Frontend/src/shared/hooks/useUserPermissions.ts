"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { modules } from "@/shared/config/modules";
import type { Modulo } from "@/shared/types/modulo";
import { haySesionPortalOffline } from "@/features/portal/lib/offline-portal";
import {
  guardarSesionOffline,
  obtenerPermisosOffline,
} from "@/shared/lib/offline-auth";

export function useUserPermissions(): Modulo[] {
  const { data: session } = useSession();
  const [offlinePermisos, setOfflinePermisos] = useState<string[]>([]);
  const [sesionPortalOffline, setSesionPortalOffline] = useState(false);

  useEffect(() => {
    setOfflinePermisos(obtenerPermisosOffline());
    setSesionPortalOffline(haySesionPortalOffline());
  }, []);

  // Cuando hay sesión activa online, sincronizar los permisos en caché
  useEffect(() => {
    const permisosSession = session?.user?.permisos as string[] | undefined;
    if (permisosSession && permisosSession.length > 0) {
      setOfflinePermisos(permisosSession);
      guardarSesionOffline({
        nombre: session?.user?.name || "Usuario",
        rol: String(session?.user?.rol || "USUARIO"),
        email: session?.user?.email,
        permisos: permisosSession,
      });
    }
  }, [session]);

  const permisos =
    (session?.user?.permisos as string[] | undefined) ||
    (offlinePermisos.length > 0 ? offlinePermisos : undefined);

  if (!permisos || permisos.length === 0) {
    if (!sesionPortalOffline) return [];
    return modules.filter((m) => m.clave === "portal_estudiante");
  }

  // Un módulo se muestra si el usuario tiene cualquier permiso de ese módulo
  return modules.filter((m) =>
    permisos.some((p) => p === m.clave || p.startsWith(`${m.clave}.`))
  );
}
