"use client";

import { Reserva } from "../schemas/reserva.schema";
import { ReservaCard } from "./ReservaCard";
import { CalendarX, AlertCircle, RefreshCw } from "lucide-react";

interface MisReservasListProps {
  reservas: Reserva[];
  isLoading: boolean;
  error?: string | null;
  onReintentar?: () => void;
  onExplorarAmbientes: () => void;
  onCancelarReserva: (reserva: Reserva) => void;
  canCancelar?: boolean;
}

export function MisReservasList({
  reservas,
  isLoading,
  error,
  onReintentar,
  onExplorarAmbientes,
  onCancelarReserva,
  canCancelar = false,
}: MisReservasListProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-card rounded-xl border border-border/60 p-5 shadow-sm space-y-4"
          >
            <div className="h-5 w-24 bg-muted rounded-full" />
            <div className="h-6 w-36 bg-muted rounded" />
            <div className="space-y-2 pt-2">
              <div className="h-4 w-48 bg-muted rounded" />
              <div className="h-4 w-40 bg-muted rounded" />
            </div>
            <div className="h-10 w-full bg-muted rounded-lg mt-4" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-destructive/5 rounded-xl border border-destructive/20 text-center my-6">
        <AlertCircle className="w-10 h-10 text-destructive mb-3" />
        <h4 className="text-base font-semibold text-foreground mb-1">
          Error al cargar tus reservas
        </h4>
        <p className="text-sm text-muted-foreground max-w-md mb-4">{error}</p>
        {onReintentar && (
          <button
            type="button"
            onClick={onReintentar}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors shadow-xs"
          >
            <RefreshCw className="w-4 h-4" />
            Reintentar
          </button>
        )}
      </div>
    );
  }

  if (reservas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-card rounded-xl border border-dashed border-border/80 my-4">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-3">
          <CalendarX className="w-6 h-6" />
        </div>
        <h4 className="text-base font-semibold text-foreground mb-1">
          Aún no tienes reservas
        </h4>
        <p className="text-sm text-muted-foreground max-w-sm mb-4">
          No tienes ambientes reservados actualmente. Explora las aulas disponibles para programar tus exámenes.
        </p>
        <button
          type="button"
          onClick={onExplorarAmbientes}
          className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
        >
          Explorar ambientes
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground font-medium uppercase tracking-wider">
        <span>{reservas.length} {reservas.length === 1 ? "reserva" : "reservas"}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reservas.map((reserva) => (
          <ReservaCard
            key={reserva.id}
            reserva={reserva}
            onCancelar={onCancelarReserva}
            canCancelar={canCancelar}
          />
        ))}
      </div>
    </div>
  );
}
