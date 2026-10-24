"use client";

import { Reserva } from "../schemas/reserva.schema";

interface ReservaCancelarDialogProps {
  isOpen: boolean;
  reserva: Reserva | null;
  onClose: () => void;
  onConfirm: (reserva: Reserva) => Promise<void>;
  isProcessing: boolean;
}

export function ReservaCancelarDialog({
  isOpen,
  reserva,
  onClose,
  onConfirm,
  isProcessing,
}: ReservaCancelarDialogProps) {
  if (!isOpen || !reserva) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-card w-full max-w-md rounded-2xl shadow-xl border border-border/80 p-6 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-bold text-foreground text-center">
          ¿Cancelar reserva?
        </h3>
        <p className="text-xs text-muted-foreground text-center mt-1 mb-5">
          El ambiente volverá a estar disponible para otras reservas.
        </p>

        {/* Resumen */}
        <div className="bg-muted/50 rounded-xl p-4 space-y-2 mb-6 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Ambiente:</span>
            <span className="font-semibold text-foreground">{reserva.ambienteNombre}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Fecha:</span>
            <span className="font-semibold text-foreground">{reserva.fecha}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Horario:</span>
            <span className="font-semibold text-foreground">
              {reserva.periodoNombre} ({reserva.horaIni} - {reserva.horaFin})
            </span>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            disabled={isProcessing}
            onClick={onClose}
            className="border border-gray-300 text-gray-700 font-medium px-5 py-2.5 rounded-xl hover:bg-gray-50 text-sm transition-colors cursor-pointer"
          >
            Volver
          </button>
          <button
            type="button"
            disabled={isProcessing}
            onClick={() => onConfirm(reserva)}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-red-600 hover:bg-red-700 active:bg-red-800 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
          >
            {isProcessing ? "Cancelando..." : "Sí, cancelar reserva"}
          </button>
        </div>
      </div>
    </div>
  );
}
