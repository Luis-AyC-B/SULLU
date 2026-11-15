// src/shared/components/guards/Can.tsx
"use client";

import { useHasPermission } from "@/shared/hooks/useHasPermission";

interface CanProps {
  permission: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function Can({ permission, fallback = null, children }: CanProps) {
  const allowed = useHasPermission(permission);

  return allowed ? <>{children}</> : <>{fallback}</>;
}
