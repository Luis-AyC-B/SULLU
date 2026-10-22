"use client";

import { Ambiente } from "../schemas/ambiente.schema";
import { AmbienteCard } from "./AmbienteCard";
import { AmbientesSinResultados } from "./AmbientesSinResultados";
import { AlertCircle, RefreshCw } from "lucide-react";

interface AmbientesGridProps {
  ambientes: Ambiente[];
  onVerDisponibilidad: (ambiente: Ambiente) => void;
  onEditarAmbiente?: (ambiente: Ambiente) => void;
  canEdit?: boolean;
  onLimpiarBusqueda: () => void;
  error?: string | null;
  onReintentar?: () => void;
}

export function AmbientesGrid({
  ambientes,
  onVerDisponibilidad,
  onEditarAmbiente,
  canEdit = true,
  onLimpiarBusqueda,
  error,
  onReintentar,
}: AmbientesGridProps) {
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-destructive/5 rounded-xl border border-destructive/20 text-center my-6">
        <AlertCircle className="w-10 h-10 text-destructive mb-3" />
        <h4 className="text-base font-semibold text-foreground mb-1">
          Error al cargar ambientes
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

  if (ambientes.length === 0) {
    return <AmbientesSinResultados onLimpiar={onLimpiarBusqueda} />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {ambientes.map((ambiente) => (
        <AmbienteCard
          key={ambiente.id}
          ambiente={ambiente}
          onVerDisponibilidad={onVerDisponibilidad}
          onEditar={onEditarAmbiente}
          canEdit={canEdit}
        />
      ))}
    </div>
  );
}
