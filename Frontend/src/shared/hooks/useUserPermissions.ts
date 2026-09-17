"use client";

import { useSession } from "next-auth/react";
import { modules } from "@/shared/config/modules";
import type { Modulo } from "@/shared/types/modulo";

export function useUserPermissions(): Modulo[] {
  const { data: session } = useSession();

  const clavesPermitidas: string[] =
    session?.permisos ?? modules.map((m) => m.clave);

  return modules.filter((m) => clavesPermitidas.includes(m.clave));
}