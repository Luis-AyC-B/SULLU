// src/features/roles/components/RoleActionsBar.tsx
"use client";

import { Plus } from "lucide-react";
import { Can } from "@/shared/components/guards/Can";

interface RoleActionsBarProps {
  onCreate: () => void;
}

export function RoleActionsBar({ onCreate }: RoleActionsBarProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-headline text-primary">Gestión de roles</h1>
        <p className="mt-1 text-body text-muted-foreground">
          Define los permisos de cada rol del sistema
        </p>
      </div>

      <Can permission="roles.crear">
        <button
          onClick={onCreate}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Nuevo rol
        </button>
      </Can>
    </div>
  );
}