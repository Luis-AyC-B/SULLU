"use client";

import { useCallback, useEffect, useState } from "react";
import { getExamenesIncidencias } from "../api/incidencias.service";
import type { ExamenIncidencia } from "../types/incidencias.types";

export function useExamenesIncidencias() {
  const [examenes, setExamenes] = useState<ExamenIncidencia[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let cancelado = false;
    setIsLoading(true);
    setError(null);

    getExamenesIncidencias()
      .then((data) => {
        if (!cancelado) setExamenes(data);
      })
      .catch((e: unknown) => {
        if (!cancelado) {
          setError(
            e instanceof Error ? e.message : "No se pudieron cargar los exámenes."
          );
        }
      })
      .finally(() => {
        if (!cancelado) setIsLoading(false);
      });

    return () => {
      cancelado = true;
    };
  }, [intento]);

  const reintentar = useCallback(() => setIntento((n) => n + 1), []);

  return { examenes, isLoading, error, reintentar };
}