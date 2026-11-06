"use client";

import { useSession } from "next-auth/react";
import { USAR_MOCKS_INCIDENCIAS } from "../api/incidencias.service";

/**
 * ==========================================================================
 * GUÍA BACKEND: PERMISOS DE USUARIO
 * ==========================================================================
 * El token JWT debe incluir en su claim `permisos` el valor:
 * - "expulsiones.registrar" (o "incidencias.registrar")
 *
 * Mientras `USAR_MOCKS_INCIDENCIAS` sea true, se permite a cualquier usuario
 * para facilitar pruebas en desarrollo. Al conectar el backend real
 * (NEXT_PUBLIC_USAR_MOCKS_INCIDENCIAS=false), solo se muestra el botón si el
 * usuario tiene este permiso asignado en la base de datos de roles.
 * ==========================================================================
 */
export function usePuedeRegistrarExpulsion(): boolean {
  const { data: sesion } = useSession();
  const permisos = (sesion?.user?.permisos as string[] | undefined) ?? [];
  return (
    USAR_MOCKS_INCIDENCIAS ||
    permisos.includes("expulsiones.registrar") ||
    permisos.includes("incidencias.registrar")
  );
}
