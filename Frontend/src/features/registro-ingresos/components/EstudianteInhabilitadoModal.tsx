// src/features/registro-ingresos/components/EstudianteInhabilitadoModal.tsx
"use client";

import { X, Ban } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";

interface EstudianteInhabilitadoModalProps {
  isOpen: boolean;
  onClose: () => void;
  estudianteNombre: string;
  codigoSis: string;
  motivoInhabilitacion?: string | null;
}

export function EstudianteInhabilitadoModal({
  isOpen,
  onClose,
  estudianteNombre,
  codigoSis,
  motivoInhabilitacion,
}: EstudianteInhabilitadoModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="w-[92vw] max-w-md p-6 rounded-2xl bg-card border border-border shadow-xl sm:p-8"
        showCloseButton={false}
      >
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
            aria-label="Cerrar modal de estudiante inhabilitado"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col items-center text-center">
          {/* Icono de inhabilitado rojo */}
          <div className="h-16 w-16 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-red-500 mb-4 shadow-xs">
            <Ban className="h-9 w-9 stroke-[2.2]" />
          </div>

          <DialogHeader className="p-0 text-center">
            <DialogTitle className="text-xl font-bold text-foreground">
              Estudiante inhabilitado
            </DialogTitle>
          </DialogHeader>

          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            <span className="font-semibold text-foreground">{estudianteNombre}</span>{" "}
            ({codigoSis}) está inhabilitado en este examen. No se puede registrar el caso excepcional.
          </p>

          {/* Motivo de inhabilitación */}
          <div className="mt-5 w-full rounded-xl border border-red-200/80 bg-red-50/60 p-3.5 text-left">
            <p className="text-xs font-semibold text-red-900 uppercase tracking-wide">
              Motivo
            </p>
            <p className="mt-1 text-sm text-red-700">
              {motivoInhabilitacion || "Inscripción de la asignatura no confirmada"}
            </p>
          </div>

          <div className="mt-6 w-full">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="w-full rounded-xl border-border hover:bg-muted py-2.5 font-medium"
            >
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
