"use client";

import { Pencil, Ban } from "lucide-react";
import { Can } from "@/shared/components/guards/Can";
import { UsuarioResumen } from "../types/user.types";

interface UserCardProps {
  user: UsuarioResumen;
  onEdit: (user: UsuarioResumen) => void;
  onDisable: (user: UsuarioResumen) => void;
}

function getInitials(nombreCompleto: string): string {
  return nombreCompleto
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

/**
 * Tarjeta de usuario para mobile (md hacia abajo).
 * Mismo contenido que UserTableRow, reacomodado en vertical:
 * avatar + nombre y acciones en la misma fila arriba,
 * badges de rol debajo, correo al final.
 */
export function UserCard({ user, onEdit, onDisable }: UserCardProps) {
  return (
    <div
      className={`rounded-xl border border-border p-3 ${
        !user.activo ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-medium text-primary-foreground">
            {getInitials(user.nombreCompleto)}
          </div>
          <span className="text-body font-medium">{user.nombreCompleto}</span>
        </div>

        <div className="flex items-center gap-1">
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
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {user.roles.map((rol) => (
          <span
            key={rol}
            className="text-label rounded-md bg-muted px-2 py-0.5 text-muted-foreground"
          >
            {rol}
          </span>
        ))}
      </div>

      <p className="mt-1.5 text-label text-muted-foreground">{user.correo}</p>
    </div>
  );
}