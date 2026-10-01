"use client";

import { Plus } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Can } from "@/shared/components/guards/Can";

interface UserActionsBarProps {
  totalUsers: number;
  onCreateClick: () => void;
}

/**
 * Encabezado de la vista de usuarios: título, contador y botón
 * "+ Nuevo usuario", visible solo si el usuario logueado tiene
 * el permiso de creación (usuarios.crear).
 */
export function UserActionsBar({
  totalUsers,
  onCreateClick,
}: UserActionsBarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-headline text-primary">Gestión de usuarios</h1>
        <p className="text-body text-muted-foreground">
          {totalUsers} {totalUsers === 1 ? "usuario" : "usuarios"} en el
          sistema
        </p>
      </div>

      <Can permission="usuarios.crear">
        <Button onClick={onCreateClick} className="w-full gap-2 sm:w-auto">
          <Plus className="h-4 w-4" />
          Nuevo usuario
        </Button>
      </Can>
    </div>
  );
}