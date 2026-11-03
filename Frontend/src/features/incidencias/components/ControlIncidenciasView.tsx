import { useMemo } from "react";
import type {
  ExamenIncidencia,
  Incidencia,
} from "../types/incidencias.types";
import { filtrarIncidenciasPorMotivo } from "../types/incidencias.types";
import { IncidenciasFiltrosToolbar } from "./IncidenciasFiltrosToolbar";
import {
  IncidenciasError,
  IncidenciasSkeleton,
  IncidenciasVacio,
} from "./IncidenciasEstados";
import { IncidenciasLista } from "./IncidenciasLista";

interface ControlIncidenciasViewProps {
  examenes: ExamenIncidencia[];
  examenesLoading: boolean;
  examenesError: string | null;
  onReintentarExamenes: () => void;

  examenId: string | null;
  onExamenChange: (examenId: string) => void;

  motivoSeleccionado?: string;
  onMotivoChange?: (motivo: string) => void;

  incidencias: Incidencia[] | null;
  incidenciasLoading: boolean;
  incidenciasError: string | null;
  onReintentarIncidencias: () => void;
}

export function ControlIncidenciasView({
  examenes,
  examenesLoading,
  examenesError,
  onReintentarExamenes,
  examenId,
  onExamenChange,
  motivoSeleccionado = "TODOS",
  onMotivoChange,
  incidencias,
  incidenciasLoading,
  incidenciasError,
  onReintentarIncidencias,
}: ControlIncidenciasViewProps) {
  const incidenciasFiltradas = useMemo(() => {
    if (!incidencias) return null;
    return filtrarIncidenciasPorMotivo(incidencias, motivoSeleccionado);
  }, [incidencias, motivoSeleccionado]);

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

  if (examenes.length === 0) {
    return (
      <IncidenciasVacio
        titulo="No hay exámenes disponibles"
        descripcion="Cuando haya exámenes asignados podrás consultar y registrar incidencias."
      />
    );
  }

  const hayFiltroActivo = motivoSeleccionado !== "TODOS";

  return (
    <div className="flex flex-col gap-6">
      {/* HU-18: Barra con filtros combinables de Materia y Motivo */}
      <IncidenciasFiltrosToolbar
        examenes={examenes}
        examenId={examenId}
        onExamenChange={onExamenChange}
        motivoSeleccionado={motivoSeleccionado}
        onMotivoChange={onMotivoChange ?? (() => {})}
        disabled={incidenciasLoading}
      />

      {incidenciasLoading && <IncidenciasSkeleton />}

      {/* Error sin datos previos: reemplaza la lista */}
      {!incidenciasLoading && incidenciasError && incidencias === null && (
        <IncidenciasError
          mensaje={incidenciasError}
          onReintentar={onReintentarIncidencias}
        />
      )}

      {/* Error al recargar con datos ya visibles: aviso encima de la lista */}
      {incidencias !== null && incidenciasError && (
        <IncidenciasError
          mensaje={incidenciasError}
          onReintentar={onReintentarIncidencias}
        />
      )}

      {/* Caso sin incidencias en el examen */}
      {incidencias !== null && incidencias.length === 0 && (
        <IncidenciasVacio
          titulo="No hay incidencias registradas para este examen"
          descripcion="Los intentos de ingreso de estudiantes no habilitados aparecerán aquí."
        />
      )}

      {/* Caso con incidencias pero ninguna coincide con el motivo filtrado */}
      {incidencias !== null &&
        incidencias.length > 0 &&
        incidenciasFiltradas !== null &&
        incidenciasFiltradas.length === 0 && (
          <IncidenciasVacio
            titulo="No se encontraron observaciones para el motivo seleccionado"
            descripcion="Prueba seleccionando otro motivo o vuelve a 'Todos los motivos'."
          />
        )}

      {/* Lista con los resultados filtrados */}
      {incidenciasFiltradas !== null && incidenciasFiltradas.length > 0 && (
        <IncidenciasLista incidencias={incidenciasFiltradas} />
      )}
    </div>
  );
}
