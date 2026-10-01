// src/shared/hooks/useHasPermission.ts
"use client";

import { useSession } from "next-auth/react";

export function useHasPermission(permiso: string): boolean {
  const { data: session, status } = useSession();

  if (status === "loading") return false;

  const permisos = session?.user?.permisos as string[] | undefined;
  return !!permisos?.includes(permiso);
}