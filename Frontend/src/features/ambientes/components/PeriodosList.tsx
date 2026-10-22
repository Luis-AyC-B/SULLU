"use client";

import { PeriodoDisponibilidad } from "../schemas/ambiente.schema";
import { Lock, ChevronRight, AlertCircle, RefreshCw } from "lucide-react";

interface PeriodosListProps {
  periodos: PeriodoDisponibilidad[];
  isLoading: boolean;
  error?: string | null;
  onReintentar?: () => void;
  onSelectPeriodo: (periodo: PeriodoDisponibilidad) => void;
  canReservar?: boolean;
}

export function PeriodosList({
  periodos,
  isLoading,
  error,
  onReintentar,
  onSelectPeriodo,
  canReservar = false,
}: PeriodosListProps) {
  const libresCount = periodos.filter((p) => p.estado === "LIBRE").length;

  if (isLoading) {
    return (
      <div className="space-y-3 py-2 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-14 bg-muted rounded-xl border border-border/50"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-5 bg-destructive/5 rounded-xl border border-destructive/20 text-center my-2 space-y-2">
        <AlertCircle className="w-6 h-6 text-destructive mx-auto" />
        <p className="text-sm text-foreground font-medium">{error}</p>
        {onReintentar && (
          <button
            type="button"
            onClick={onReintentar}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary border border-primary/30 rounded-md hover:bg-primary/5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reintentar
          </button>
        )}
      </div>
    );
  }

  if (periodos.length === 0) {
    return (
      <div className="p-6 text-center text-muted-foreground text-sm bg-muted/30 rounded-xl border border-dashed border-border/70 my-2">
        No hay periodos disponibles registrados para esta fecha.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground pb-1">
        <span>Periodos del día</span>
        <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
          {libresCount} {libresCount === 1 ? "libre" : "libres"}
        </span>
      </div>

      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {periodos.map((periodo) => {
          const isLibre = periodo.estado === "LIBRE";

          return (
            <button
              key={periodo.id}
              type="button"
              disabled={!isLibre || !canReservar}
              onClick={() => isLibre && onSelectPeriodo(periodo)}
              className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-sm font-medium transition-all ${
                isLibre
                  ? "border-emerald-200 bg-emerald-50/60 text-emerald-950 hover:bg-emerald-100/70 hover:border-emerald-300 active:scale-[0.99] cursor-pointer"
                  : "border-border/60 bg-muted/60 text-muted-foreground cursor-not-allowed opacity-80"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">
                  {periodo.periodoNombre}
                </span>
                <span className="text-xs text-muted-foreground">
                  · {periodo.horaIni} - {periodo.horaFin}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {isLibre ? (
                  <>
                    <span className="text-xs font-semibold text-emerald-700">Libre</span>
                    <ChevronRight className="w-4 h-4 text-emerald-600" />
                  </>
                ) : (
                  <>
                    <span className="text-xs font-medium text-muted-foreground">Reservado</span>
                    <Lock className="w-4 h-4 text-muted-foreground" />
                  </>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground text-center pt-1">
        Selecciona un periodo libre para continuar. Los horarios reservados no están disponibles.
      </p>
    </div>
  );
}
