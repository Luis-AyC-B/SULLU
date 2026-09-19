// src/shared/components/guards/Can.tsx
"use client";

import { useSession } from "next-auth/react";

interface CanProps {
  permission: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function Can({ permission, fallback = null, children }: CanProps) {
  const { data: session } = useSession();
  const permisos = session?.permisos as string[] | undefined;

  // Mismo fallback que useHasPermission: sin sesión real, permitir todo.
  const allowed = !permisos ? true : permisos.includes(permission);

  return allowed ? <>{children}</> : <>{fallback}</>;
}