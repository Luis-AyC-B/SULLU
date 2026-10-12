"use client";

import { useState, useEffect, useCallback } from "react";
import { PeriodoDisponibilidad } from "../schemas/ambiente.schema";
import { ambientesApi } from "../api/ambientes.api";

export function useDisponibilidad(ambienteId: string | number | null, fecha: string) {
  const [periodos, setPeriodos] = useState<PeriodoDisponibilidad[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDisponibilidad = useCallback(async () => {
    if (!ambienteId || !fecha) return;

    try {
      setIsLoading(true);
      setError(null);
      const data = await ambientesApi.getDisponibilidad(ambienteId, fecha);
      setPeriodos(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Error al consultar la disponibilidad de horarios.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [ambienteId, fecha]);

  useEffect(() => {
    fetchDisponibilidad();
  }, [fetchDisponibilidad]);

  return {
    periodos,
    isLoading,
    error,
    refetch: fetchDisponibilidad,
  };
}
