// src/features/roles/components/DeleteRoleDialog.tsx
"use client";

import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/components/ui/dialog";
import type { RolResumen } from "../types/role.types";

interface DeleteRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rol: RolResumen | null;
  onConfirm: (rol: RolResumen) => void;
}

export function DeleteRoleDialog({
  open,
  onOpenChange,
  rol,
  onConfirm,
}: DeleteRoleDialogProps) {
  if (!rol) return null;

  const tieneUsuarios = rol.usuariosAsignados > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Eliminar rol
          </DialogTitle>
        </DialogHeader>

        {tieneUsuarios ? (
          <p className="text-body text-muted-foreground">
            No puedes eliminar <strong className="text-foreground">{rol.nombre}</strong>{" "}
            porque tiene <strong className="text-foreground">{rol.usuariosAsignados}</strong>{" "}
            usuario{rol.usuariosAsignados !== 1 ? "s" : ""} asignado
            {rol.usuariosAsignados !== 1 ? "s" : ""}. Reasígnalos a otro rol antes de
            continuar.
          </p>
        ) : (
          <p className="text-body text-muted-foreground">
            ¿Seguro que quieres eliminar el rol{" "}
            <strong className="text-foreground">{rol.nombre}</strong>? Esta acción no se
            puede deshacer.
          </p>
        )}

        <DialogFooter className="mt-2 flex justify-end gap-2">
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
          >
            {tieneUsuarios ? "Entendido" : "Cancelar"}
          </button>

          {!tieneUsuarios && (
            <button
              onClick={() => {
                onConfirm(rol);
                onOpenChange(false);
              }}
              className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:opacity-90"
            >
              Eliminar
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}