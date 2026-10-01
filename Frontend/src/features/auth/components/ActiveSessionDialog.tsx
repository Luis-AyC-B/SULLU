'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { TriangleAlert } from 'lucide-react';
import { SessionConflictInfo } from '../types/auth.types';

interface ActiveSessionDialogProps {
  conflictInfo: SessionConflictInfo | null;
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ActiveSessionDialog({
  conflictInfo,
  isOpen,
  onConfirm,
  onCancel,
  isLoading = false,
}: ActiveSessionDialogProps) {
  if (!isOpen || !conflictInfo) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md bg-white border border-border shadow-2xl rounded-2xl p-6">
        <DialogHeader className="flex flex-col items-center text-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary/15 text-secondary">
            <TriangleAlert className="h-6 w-6 text-[#D98300]" />
          </div>
          <DialogTitle className="text-lg font-bold text-foreground">
            Sesión activa en otro dispositivo
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Ya tienes una sesión abierta en otro dispositivo. ¿Deseas cerrarla e ingresar aquí?
          </DialogDescription>
        </DialogHeader>

        {conflictInfo.dispositivoPrevio && (
          <div className="rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">Detalle de la sesión previa:</p>
            <p>{conflictInfo.dispositivoPrevio}</p>
            {conflictInfo.fechaHoraPrevia && (
              <p className="mt-1 text-[11px] text-muted-foreground/80">
                Hora de inicio: {conflictInfo.fechaHoraPrevia}
              </p>
            )}
          </div>
        )}

        <DialogFooter className="mt-4 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end border-t-0 p-0 bg-transparent">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="default"
            onClick={onConfirm}
            disabled={isLoading}
            className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
          >
            {isLoading ? 'Cerrando sesión previa...' : 'Aceptar e ingresar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
