"use client";

import { useCallback, useEffect, useState } from "react";
import { obtenerIncidenciasPorExamen } from "../api/incidencias.service";
import type { Incidencia } from "../types/incidencias.types";

// `incidencias` es null mientras no hay datos del examen seleccionado.
export function useIncidenciasPorExamen(examenId: string | null) {
  const [incidencias, setIncidencias] = useState<Incidencia[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    setIncidencias(null);
    setError(null);
  }, [examenId]);

  useEffect(() => {
    if (!examenId) return;
    let cancelado = false;

    obtenerIncidenciasPorExamen(examenId)
      .then((datos) => {
        if (cancelado) return;
        setIncidencias(Array.isArray(datos) ? datos : []);
        setError(null);
      })
      .catch((e: unknown) => {
        if (cancelado) return;
        console.warn(
          "Error al obtener incidencias del examen o examen sin incidencias:",
          e,
        );
        setIncidencias([]);
        setError(null);
      });

    return () => {
      cancelado = true;
    };
  }, [examenId, recarga]);

  const recargar = useCallback(() => {
    setError(null);
    setRecarga((n) => n + 1);
  }, []);

  const cargando = examenId !== null && incidencias === null && error === null;

  return { incidencias, cargando, error, recargar };
}