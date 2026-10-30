"use client";

import { useCallback, useEffect, useState } from "react";
import { obtenerExamenesExpulsion } from "../api/incidencias.service";
import type { ExamenExpulsion } from "../types/incidencias.types";

export function useExamenesExpulsion() {
  const [examenes, setExamenes] = useState<ExamenExpulsion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    setError(null);

    obtenerExamenesExpulsion()
      .then((datos) => {
        if (!cancelado) setExamenes(datos);
      })
      .catch((e: unknown) => {
        if (!cancelado) {
          setError(
            e instanceof Error ? e.message : "No se pudieron cargar los exámenes.",
          );
        }
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [intento]);

  const reintentar = useCallback(() => setIntento((n) => n + 1), []);

  return { examenes, cargando, error, reintentar };
}