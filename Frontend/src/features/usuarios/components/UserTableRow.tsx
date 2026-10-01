"use client";

import { Pencil, Ban } from "lucide-react";
import {
  TableRow,
  TableCell,
} from "@/shared/components/ui/table";
import { Can } from "@/shared/components/guards/Can";
import { getRolBadgeClasses } from "../lib/rol-badge";
import { UsuarioResumen } from "../types/user.types";

interface UserTableRowProps {
  user: UsuarioResumen;
  onEdit: (user: UsuarioResumen) => void;
  onDisable: (user: UsuarioResumen) => void;
}

/** Genera iniciales a partir del nombre completo (ej: "Ana Rondón" -> "AR") */
function getInitials(nombreCompleto: string): string {
  return nombreCompleto
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function UserTableRow({ user, onEdit, onDisable }: UserTableRowProps) {
  // El administrador no muestra botones de editar ni deshabilitar
  const esAdmin = user.roles.some((r) => r.toLowerCase() === "administrador");

  return (
    <TableRow
      className={`hover:bg-muted/50 ${!user.activo ? "opacity-60" : ""}`}
    >
      {/* Avatar + nombre completo */}
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
            {getInitials(user.nombreCompleto)}
          </div>
          <span className="text-body font-medium">{user.nombreCompleto}</span>
        </div>
      </TableCell>

      {/* Roles: soporta multi-rol con varios badges */}
      <TableCell>
        <div className="flex flex-wrap gap-1.5">
          {user.roles.map((rol) => (
            <span
              key={rol}
              className={`text-label rounded-md px-2 py-0.5 ${getRolBadgeClasses(
                rol
              )}`}
            >
              {rol}
            </span>
          ))}
        </div>
      </TableCell>

      {/* Correo */}
      <TableCell>
        <span className="text-body text-muted-foreground">{user.correo}</span>
      </TableCell>

      {/* Acciones: visibles solo con el permiso correspondiente; el administrador no tiene acciones */}
      <TableCell>
        {!esAdmin && (
          <div className="flex items-center justify-end gap-1">
            <Can permission="usuarios.editar">
              <button
                type="button"
                onClick={() => onEdit(user)}
                className="rounded-md border border-border p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label={`Editar a ${user.nombreCompleto}`}
              >
                <Pencil className="h-4 w-4" />
              </button>
            </Can>

            {/* Solo se puede desactivar un usuario que sigue activo */}
            {user.activo && (
              <Can permission="usuarios.desactivar">
                <button
                  type="button"
                  onClick={() => onDisable(user)}
                  className="rounded-full border border-accent p-1.5 text-accent transition-colors hover:bg-accent hover:text-accent-foreground"
                  aria-label={`Desactivar a ${user.nombreCompleto}`}
                >
                  <Ban className="h-4 w-4" />
                </button>
              </Can>
            )}
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}