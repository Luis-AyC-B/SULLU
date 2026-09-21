// src/shared/components/guards/Can.tsx
"use client";

import { useSession } from "next-auth/react";

interface SessionWithPermisos {
  permisos?: string[];
  user?: {
    permisos?: string[];
  };
}

interface CanProps {
  permission: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function Can({ permission, fallback = null, children }: CanProps) {
  const { data: session } = useSession();
  const sessionObj = session as unknown as SessionWithPermisos | undefined;

  const permisos = sessionObj?.permisos || sessionObj?.user?.permisos;
  const allowed = Array.isArray(permisos) && permisos.includes(permission);

  return allowed ? <>{children}</> : <>{fallback}</>;
}