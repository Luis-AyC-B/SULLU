// src/shared/components/guards/Can.tsx
"use client";

import { useSession } from "next-auth/react";
import { obtenerPermisosOffline } from "@/shared/lib/offline-auth";

interface CanProps {
  permission: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function Can({ permission, fallback = null, children }: CanProps) {
  const { data: session } = useSession();

  const permisosSession = session?.user?.permisos as string[] | undefined;
  const permisos =
    permisosSession && permisosSession.length > 0
      ? permisosSession
      : obtenerPermisosOffline();

  const allowed = permisos.includes(permission);

  return allowed ? <>{children}</> : <>{fallback}</>;
}
