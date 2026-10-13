"use client";

import { Reserva } from "../schemas/reserva.schema";
import { CheckCircle2 } from "lucide-react";

interface ReservaCardProps {
  reserva: Reserva;
  onCancelar: (reserva: Reserva) => void;
  canCancelar?: boolean;
}

export function ReservaCard({ reserva, onCancelar, canCancelar = false }: ReservaCardProps) {
  const tieneExamen = Boolean(reserva.tieneExamenAsignado || reserva.examenAsociado);

  return (
    <div className="bg-card text-card-foreground rounded-xl border border-border/60 p-5 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-1.5 mb-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Reservado
          </span>
        </div>

        <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-1">
          {reserva.facultad || "FCyT"}
        </p>

        <h3 className="text-xl font-bold text-foreground mb-3">
          {reserva.ambienteNombre}
        </h3>

        <div className="text-sm text-muted-foreground space-y-1 mb-4">
          <p>
            <span className="font-medium text-foreground/80">Fecha:</span> {reserva.fecha}
          </p>
          <p>
            <span className="font-medium text-foreground/80">Horario:</span> {reserva.periodoNombre} ({reserva.horaIni} - {reserva.horaFin})
          </p>
        </div>

        <div className="text-xs text-muted-foreground pt-2 border-t border-border/50 mb-5">
          <p className="font-medium text-foreground/70">Examen asociado:</p>
          <p className={tieneExamen ? "text-foreground font-semibold" : "text-muted-foreground"}>
            {reserva.examenAsociado || "Sin examen asignado"}
          </p>
        </div>
      </div>

      <div>
        {/* TASK-15.6: Botón cancelar deshabilitado si tiene examen asignado */}
        {tieneExamen ? (
          <div>
            <button
              type="button"
              disabled
              className="w-full py-2.5 px-4 rounded-lg font-medium text-sm border border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
            >
              Cancelar reserva
            </button>
            <p className="text-xs text-muted-foreground text-center mt-2">
              No se puede cancelar: el ambiente tiene un examen asignado
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onCancelar(reserva)}
            disabled={!canCancelar}
            className="w-full py-2.5 px-4 rounded-lg font-medium text-sm border border-red-200 text-red-600 hover:bg-red-50 active:bg-red-100 transition-colors cursor-pointer"
          >
            Cancelar reserva
          </button>
        )}
      </div>
    </div>
  );
}
