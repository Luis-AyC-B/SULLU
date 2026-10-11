"use client";

import { useSession } from "next-auth/react";

// Solo controla si se muestra el botón "Registrar incidencia"; el backend es
// quien autoriza de verdad. El Docente entra a la pantalla con "incidencias.ver"
// (solo lectura) y no ve el botón; Personal de control tiene "incidencias.crear".
export function usePuedeRegistrarIncidencia(): boolean {
  const { data: session } = useSession();
  const permisos = (session?.user?.permisos as string[] | undefined) ?? [];
  return permisos.includes("incidencias.crear");
}