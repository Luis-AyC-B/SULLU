"use client";

import { useCallback, useState } from "react";
import { obtenerIncidenciasPorExamen } from "../api/incidencias.service";
import { filtrarParaReporte, type FiltrosReporte } from "../lib/filtrarReporte";
import { generarReportePdf } from "../lib/generarReporte";
import type { ExamenExpulsion } from "../types/incidencias.types";

export function useGenerarReporte() {
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generar = useCallback(
    async (
      examen: ExamenExpulsion,
      filtros: FiltrosReporte,
      generadoPor?: string,
    ): Promise<boolean> => {
      setGenerando(true);
      setError(null);
      try {
        // Cuando exista el back, aquí se puede cambiar por un endpoint de reporte.
        const todas = await obtenerIncidenciasPorExamen(examen.id);
        const incidencias = filtrarParaReporte(todas, filtros);
        if (incidencias.length === 0) {
          setError("No hay expulsiones que coincidan con los filtros.");
          return false;
        }
        await generarReportePdf({ examen, incidencias, filtros, generadoPor });
        return true;
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "No se pudo generar el reporte.",
        );
        return false;
      } finally {
        setGenerando(false);
      }
    },
    [],
  );

  const limpiarError = useCallback(() => setError(null), []);

  return { generar, generando, error, limpiarError };
}