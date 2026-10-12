"use client";

import { useState, useEffect, useCallback } from "react";
import { controlIngresoService } from "../services/control-ingreso.service";
import type { ResumenEnVivoData } from "../types/control-ingreso.types";

const POLL_INTERVAL_MS = 8000; // Actualización automática cada 8 segundos

export function useResumenEnVivo(examenId: number | null) {
  const [resumen, setResumen] = useState<ResumenEnVivoData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchResumen = useCallback(async (isInitial = false) => {
    if (!examenId) return;
    if (isInitial) setIsLoading(true);

    try {
      const data = await controlIngresoService.getResumenExamen(examenId);
      setResumen(data);
      setError(null);
    } catch (err: unknown) {
      if (isInitial) {
        const msg =
          err instanceof Error ? err.message : "Error al obtener el resumen";
        setError(msg);
      }
    } finally {
      if (isInitial) setIsLoading(false);
    }
  }, [examenId]);

  useEffect(() => {
    if (!examenId) return;

    fetchResumen(true);

    const interval = setInterval(() => {
      fetchResumen(false);
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [examenId, fetchResumen]);

  return {
    resumen,
    isLoading,
    error,
    refetch: () => fetchResumen(false),
  };
}
