"use client";

import { useSession } from "next-auth/react";
import { USAR_MOCKS_INCIDENCIAS } from "../api/incidencias.service";

// Solo oculta el botón; el servidor es quien autoriza de verdad.
// TODO: quitar el bypass de mocks cuando el back defina el permiso.
export function usePuedeRegistrarExpulsion(): boolean {
  const { data: sesion } = useSession();
  const permisos = (sesion?.user?.permisos as string[] | undefined) ?? [];
  return USAR_MOCKS_INCIDENCIAS || permisos.includes("expulsiones.registrar");
}