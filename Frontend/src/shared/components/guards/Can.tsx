// src/shared/components/guards/Can.tsx
"use client";

import { useSession } from "next-auth/react";

interface CanProps {
  permission: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function Can({ permission, fallback = null, children }: CanProps) {
  const { data: session, status } = useSession();

  if (status === "loading") return null;

  const permisos = session?.user?.permisos as string[] | undefined;
  const allowed = !!permisos?.includes(permission);

  return allowed ? <>{children}</> : <>{fallback}</>;
}