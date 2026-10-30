import type { Incidencia, MotivoExpulsion } from "../types/incidencias.types";
import { coincideBusqueda } from "./filtrarIncidencias";

export interface FiltrosReporte {
  examenId: string;
  motivo: MotivoExpulsion | "TODOS";
  estudiante: string; // nombre o código SIS
}

export function filtrarParaReporte(
  incidencias: Incidencia[],
  f: FiltrosReporte,
): Incidencia[] {
  return incidencias.filter((i) => {
    if (f.motivo !== "TODOS" && i.motivo !== f.motivo) return false;
    return coincideBusqueda(i.estudianteNombre, i.codigoSis, f.estudiante);
  });
}