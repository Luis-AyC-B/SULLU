// src/features/roles/components/RoleCard.tsx
"use client";

import { Pencil, Users, Shield } from "lucide-react";
import { Can } from "@/shared/components/guards/Can";
import type { RolResumen } from "../types/role.types";

const BADGE_STYLES: Record<RolResumen["colorBadge"], string> = {
  blue: "bg-primary/10 text-primary",
  red: "bg-destructive/10 text-destructive",
  green: "bg-success/10 text-success",
  gray: "bg-muted text-muted-foreground",
};

interface RoleCardProps {
  rol: RolResumen;
  onEdit: (rol: RolResumen) => void;
  onDelete: (rol: RolResumen) => void;
}

export function RoleCard({ rol, onEdit, onDelete }: RoleCardProps) {
  const extra = Math.max(rol.permisosCount - rol.permisosPreview.length, 0);

  return (
    <div className="flex flex-col rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between">
        <span
          className={`inline-block rounded-md px-2 py-0.5 text-xs font-medium ${BADGE_STYLES[rol.colorBadge]}`}
        >
          {rol.nombre}
        </span>

        {!rol.esPlantilla && (
          <Can permission="roles.editar">
            <button
              onClick={() => onEdit(rol)}
              aria-label={`Editar ${rol.nombre}`}
              className="text-muted-foreground hover:text-foreground"
            >
              <Pencil className="h-4 w-4" />
            </button>
          </Can>
        )}
      </div>

      <p className="mt-2 text-sm text-muted-foreground">{rol.descripcion}</p>

      <div className="mt-2.5 flex items-center gap-4 border-b border-border pb-2.5 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Users className="h-3.5 w-3.5" />
          <strong className="text-foreground">{rol.usuariosAsignados}</strong> usuarios
        </span>
        <span className="flex items-center gap-1">
          <Shield className="h-3.5 w-3.5" />
          <strong className="text-foreground">{rol.permisosCount}</strong> permisos
        </span>
      </div>

      <ul className="mt-2.5 flex flex-1 flex-col gap-1">
        {rol.permisosPreview.map((label) => (
          <li key={label} className="flex items-center gap-1.5 text-sm text-foreground">
            <span className="text-success">✓</span>
            {label}
          </li>
        ))}
        {extra > 0 && (
          <li className="text-sm text-muted-foreground">+{extra} más</li>
        )}
      </ul>

      {!rol.esPlantilla && (
        <Can permission="roles.eliminar">
          <button
            onClick={() => onDelete(rol)}
            className="mt-4 self-end text-sm font-medium text-primary hover:underline"
          >
            Eliminar
          </button>
        </Can>
      )}
    </div>
  );
}