"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { UsuarioResumen } from "../types/user.types";

interface DisableUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  usuario: UsuarioResumen | null;
  onConfirm: (usuario: UsuarioResumen) => void;
  isSubmitting?: boolean;
}

/**
 * Confirmación previa a desactivar un usuario.
 * No borra el registro: el backend setea deletedAt (soft delete),
 * por eso el usuario puede reingresar más adelante usando el mismo correo.
 */
export function DisableUserDialog({
  open,
  onOpenChange,
  usuario,
  onConfirm,
  isSubmitting,
}: DisableUserDialogProps) {
  if (!usuario) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-headline text-xl">
            Desactivar usuario
          </DialogTitle>
          <DialogDescription className="text-body text-muted-foreground">
            ¿Seguro que deseas desactivar a{" "}
            <span className="font-medium text-foreground">
              {usuario.nombreCompleto}
            </span>
            ? No podrá iniciar sesión hasta que se reactive su cuenta usando
            el mismo correo.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => onConfirm(usuario)}
            disabled={isSubmitting}
          >
            Desactivar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}