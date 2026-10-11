import type {
  ExamenIncidencia,
  Incidencia,
} from "../types/incidencias.types";
import { ExamenSelect } from "./ExamenSelect";
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

  if (examenes.length === 0) {
    return (
      <IncidenciasVacio
        titulo="No hay exámenes disponibles"
        descripcion="Cuando haya exámenes asignados podrás consultar y registrar incidencias."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <ExamenSelect
        id="incidencias-examen"
        examenes={examenes}
        value={examenId ?? ""}
        onChange={onExamenChange}
        className="md:max-w-xl"
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

      {incidencias !== null && incidencias.length === 0 && (
        <IncidenciasVacio
          titulo="No hay incidencias registradas para este examen"
          descripcion="Los intentos de ingreso de estudiantes no habilitados aparecerán aquí."
        />
      )}

      {incidencias !== null && incidencias.length > 0 && (
        <IncidenciasLista incidencias={incidencias} />
      )}
    </div>
  );
}