// src/features/registro-ingresos/components/ExamenFinalizadoModal.tsx
"use client";

import { X, ClockAlert, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";

interface ExamenFinalizadoModalProps {
  isOpen: boolean;
  onClose: () => void;
  examenNombre?: string;
  horario?: string;
  fecha?: string;
}

export function ExamenFinalizadoModal({
  isOpen,
  onClose,
  examenNombre,
  horario,
  fecha,
}: ExamenFinalizadoModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="w-[92vw] max-w-md p-6 rounded-2xl bg-card border border-border shadow-2xl sm:p-8"
        showCloseButton={false}
      >
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
            aria-label="Cerrar modal de examen finalizado"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col items-center text-center">
          {/* Icono de examen finalizado con estilo institucional */}
          <div className="h-16 w-16 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-4 shadow-xs">
            <ClockAlert className="h-8 w-8 stroke-[2.2]" />
          </div>

          <DialogHeader className="p-0 text-center">
            <DialogTitle className="text-xl font-bold text-foreground">
              El examen ya finalizó
            </DialogTitle>
          </DialogHeader>

          {/* Nombre y horario del examen */}
          {examenNombre && (
            <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/80 text-xs font-medium text-foreground">
              <span>{examenNombre}</span>
              {horario && <span className="text-muted-foreground">({horario})</span>}
            </div>
          )}

          <p className="mt-3.5 text-sm text-muted-foreground leading-relaxed">
            El horario límite programado para este examen ha concluido. No se pueden registrar casos excepcionales una vez cerrada la sesión.
          </p>

          {/* Explicación de la regla de negocio solicitada */}
          <div className="mt-5 w-full rounded-xl border border-amber-200/90 bg-amber-50/70 p-3.5 text-left">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-900 leading-normal">
                <strong className="font-semibold">Control de asistencia:</strong> Los estudiantes que no registraron su ingreso durante el periodo del examen se computan automáticamente como <span className="font-semibold">"No asistió"</span> en la sección de ingresos rechazados.
              </p>
            </div>
          </div>

          <div className="mt-6 w-full">
            <Button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 py-2.5 font-medium shadow-xs"
            >
              Entendido
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
