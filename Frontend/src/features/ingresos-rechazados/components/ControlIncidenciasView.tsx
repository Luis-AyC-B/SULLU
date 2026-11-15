// src/features/incidencias/components/ControlIncidenciasView.tsx
"use client";

import type {
  ExamenIncidencia,
  FiltrosIncidencias,
  Incidencia,
  RolIncidencias,
} from "../types/incidencias.types";
import { IncidenciasFiltrosToolbar } from "./IncidenciasFiltrosToolbar";
import {
  IncidenciasError,
  IncidenciasSkeleton,
  IncidenciasVacio,
} from "./IncidenciasEstados";
import { IncidenciasLista } from "./IncidenciasLista";

interface ControlIncidenciasViewProps {
  rol: RolIncidencias;
  examenes: ExamenIncidencia[];
  examenesLoading: boolean;
  examenesError: string | null;
  onReintentarExamenes: () => void;

  filtros: FiltrosIncidencias;
  onFiltrosChange: (nuevosFiltros: FiltrosIncidencias) => void;

  incidencias: Incidencia[] | null;
  incidenciasLoading: boolean;
  incidenciasError: string | null;
  onReintentarIncidencias: () => void;
}

export function ControlIncidenciasView({
  rol,
  examenes,
  examenesLoading,
  examenesError,
  onReintentarExamenes,
  filtros,
  onFiltrosChange,
  incidencias,
  incidenciasLoading,
  incidenciasError,
  onReintentarIncidencias,
}: ControlIncidenciasViewProps) {
  if (examenesLoading) {
    return <IncidenciasSkeleton conSelector />;
  }

  if (examenesError) {
    return (
      <IncidenciasError
        mensaje={examenesError}
        onReintentar={onReintentarExamenes}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* HU-18: Barra con filtros combinables y cascada según rol */}
      <IncidenciasFiltrosToolbar
        rol={rol}
        examenes={examenes}
        filtros={filtros}
        onFiltrosChange={onFiltrosChange}
        disabled={incidenciasLoading}
      />

      {incidenciasLoading && <IncidenciasSkeleton />}

      {/* Error sin datos previos */}
      {!incidenciasLoading && incidenciasError && incidencias === null && (
        <IncidenciasError
          mensaje={incidenciasError}
          onReintentar={onReintentarIncidencias}
        />
      )}

      {/* Error al recargar con datos ya visibles */}
      {incidencias !== null && incidenciasError && (
        <IncidenciasError
          mensaje={incidenciasError}
          onReintentar={onReintentarIncidencias}
        />
      )}

      {/* Criterio 15: Caso sin observaciones para los filtros elegidos */}
      {!incidenciasLoading &&
        incidencias !== null &&
        incidencias.length === 0 && (
          <IncidenciasVacio
            titulo="Sin observaciones"
            descripcion="No se encontraron observaciones registradas para los filtros seleccionados."
          />
        )}

      {/* Lista con los resultados filtrados y contador */}
      {!incidenciasLoading &&
        incidencias !== null &&
        incidencias.length > 0 && (
          <IncidenciasLista incidencias={incidencias} />
        )}
    </div>
  );
}
