"use client";

import { useState, useEffect, useCallback } from "react";
import { controlIngresoService } from "../services/control-ingreso.service";
import type { ExamenAsignado } from "../types/control-ingreso.types";

export function useExamenesAsignados() {
  const [examenes, setExamenes] = useState<ExamenAsignado[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExamenes = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await controlIngresoService.getMisExamenes();
      setExamenes(data);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Error al cargar los exámenes asignados";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExamenes();
  }, [fetchExamenes]);

  return {
    examenes,
    isLoading,
    error,
    refetch: fetchExamenes,
  };
}
