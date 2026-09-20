// src/shared/hooks/useUserPermissions.ts
"use client";

import { useSession } from "next-auth/react";
import { modules } from "@/shared/config/modules";
import type { Modulo } from "@/shared/types/modulo";

export function useUserPermissions(): Modulo[] {
  const { data: session } = useSession();
  const permisos = session?.user?.permisos as string[] | undefined;

  if (!permisos) return [];

  return modules.filter((m) => permisos.includes(`${m.clave}.ver`));
}