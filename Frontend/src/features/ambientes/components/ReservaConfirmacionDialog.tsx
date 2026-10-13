"use client";

import { Ambiente, PeriodoDisponibilidad } from "../schemas/ambiente.schema";

interface ReservaConfirmacionDialogProps {
  isOpen: boolean;
  ambiente: Ambiente | null;
  fecha: string;
  periodo: PeriodoDisponibilidad | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isProcessing: boolean;
}

export function ReservaConfirmacionDialog({
  isOpen,
  ambiente,
  fecha,
  periodo,
  onClose,
  onConfirm,
  isProcessing,
}: ReservaConfirmacionDialogProps) {
  if (!isOpen || !ambiente || !periodo) return null;

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-card w-full max-w-md rounded-2xl shadow-2xl border border-border/80 p-6 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-bold text-foreground text-center">
          Confirmar reserva
        </h3>
        <p className="text-xs text-muted-foreground text-center mt-1 mb-5">
          Revisa los datos antes de confirmar tu reserva.
        </p>

        {/* Resumen */}
        <div className="bg-muted/50 rounded-xl p-4 space-y-2 mb-6 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Ambiente:</span>
            <span className="font-semibold text-foreground">{ambiente.nombre}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Fecha:</span>
            <span className="font-semibold text-foreground">{fecha}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Horario:</span>
            <span className="font-semibold text-foreground">
              {periodo.periodoNombre} ({periodo.horaIni} - {periodo.horaFin})
            </span>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            disabled={isProcessing}
            onClick={onClose}
            className="px-4 py-2.5 rounded-lg text-sm font-medium text-foreground/80 hover:bg-muted transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={isProcessing}
            onClick={onConfirm}
            className="px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-primary hover:bg-primary/90 active:bg-primary/95 transition-colors shadow-xs disabled:opacity-50"
          >
            {isProcessing ? "Confirmando..." : "Confirmar reserva"}
          </button>
        </div>
      </div>
    </div>
  );
}
