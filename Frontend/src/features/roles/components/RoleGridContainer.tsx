// src/features/roles/components/RoleGridContainer.tsx
"use client";

import { ShieldOff } from "lucide-react";
import { RoleCard } from "./RoleCard";
import type { RolResumen } from "../types/role.types";

interface RoleGridContainerProps {
  roles: RolResumen[];
  loading: boolean;
  onEdit: (rol: RolResumen) => void;
  onDelete: (rol: RolResumen) => void;
}

function RoleCardSkeleton() {
  return (
    <div className="flex flex-col rounded-lg border border-border bg-card p-5">
      <div className="h-6 w-28 animate-pulse rounded-md bg-muted" />
      <div className="mt-3 h-4 w-full animate-pulse rounded bg-muted" />
      <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-muted" />
      <div className="mt-4 flex gap-4 border-b border-border pb-3">
        <div className="h-4 w-20 animate-pulse rounded bg-muted" />
        <div className="h-4 w-20 animate-pulse rounded bg-muted" />
      </div>
      <div className="mt-3 flex flex-col gap-2">
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
        <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
        <div className="h-4 w-3/5 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

export function RoleGridContainer({
  roles,
  loading,
  onEdit,
  onDelete,
}: RoleGridContainerProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <RoleCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (roles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
        <ShieldOff className="h-10 w-10 text-muted-foreground" />
        <p className="text-body font-medium text-foreground">
          Aún no hay roles registrados
        </p>
        <p className="text-sm text-muted-foreground">
          Crea el primer rol para empezar a asignar permisos.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {roles.map((rol) => (
        <RoleCard key={rol.id} rol={rol} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
}