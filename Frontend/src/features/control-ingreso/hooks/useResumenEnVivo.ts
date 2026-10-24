"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { controlIngresoService } from "../services/control-ingreso.service";
import { activeExamStore } from "../store/useActiveExamStore";
import type { ResumenEnVivoData } from "../types/control-ingreso.types";

const POLL_INTERVAL_MS = 8000; // Actualización automática cada 8 segundos

export function useResumenEnVivo(examenId: number | null) {
  const [resumen, setResumen] = useState<ResumenEnVivoData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isFetchingRef = useRef(false);

  const fetchResumen = useCallback(
    async (isInitial = false) => {
      if (!examenId || isFetchingRef.current) return;
      isFetchingRef.current = true;
      if (isInitial) setIsLoading(true);

      try {
        const data = await controlIngresoService.getResumenExamen(examenId);
        setResumen(data);
        setError(null);
      } catch (err: unknown) {
        const axiosErr = err as { response?: { status?: number } };
        if (axiosErr?.response?.status === 404) {
          activeExamStore.clearExamenActivo();
          return;
        }
        if (isInitial) {
          const msg =
            err instanceof Error ? err.message : "Error al obtener el resumen";
          setError(msg);
        }
      } finally {
        if (isInitial) setIsLoading(false);
        isFetchingRef.current = false;
      }
    },
    [examenId]
  );

  useEffect(() => {
    if (!examenId) return;

    fetchResumen(true);

    const interval = setInterval(() => {
      fetchResumen(false);
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [examenId, fetchResumen]);

  const refetch = useCallback(() => fetchResumen(false), [fetchResumen]);

  return {
    resumen,
    isLoading,
    error,
    refetch,
  };
}
