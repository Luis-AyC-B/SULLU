"use client";

import { SearchX } from "lucide-react";

interface AmbientesSinResultadosProps {
  onLimpiar: () => void;
}

export function AmbientesSinResultados({ onLimpiar }: AmbientesSinResultadosProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-card rounded-xl border border-dashed border-border/80 my-4">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-3">
        <SearchX className="w-6 h-6" />
      </div>
      <h4 className="text-base font-semibold text-foreground mb-1">
        No se encontraron ambientes
      </h4>
      <p className="text-sm text-muted-foreground max-w-sm mb-4">
        No hay aulas que coincidan con tu término de búsqueda. Intenta con otro nombre o limpia el filtro.
      </p>
      <button
        type="button"
        onClick={onLimpiar}
        className="px-4 py-2 text-sm font-medium text-primary border border-primary/30 rounded-lg hover:bg-primary/5 transition-colors"
      >
        Limpiar búsqueda
      </button>
    </div>
  );
}
