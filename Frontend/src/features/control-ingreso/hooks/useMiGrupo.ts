"use client";

import { useState, useEffect } from "react";
import { getMiGrupoControlador } from "../api/mi-grupo.api";
import type { MiGrupoControlador } from "../types/control-ingreso.types";

interface UseMiGrupoResult {
  miGrupo: MiGrupoControlador | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * HU17: Hook para obtener el grupo asignado al controlador.
 * Si el usuario no es un controlador con grupo (ej: admin), miGrupo será null.
 */
export function useMiGrupo(examenId: number): UseMiGrupoResult {
  const [miGrupo, setMiGrupo] = useState<MiGrupoControlador | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!examenId) return;

    let cancelled = false;

    const cargar = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getMiGrupoControlador(examenId);
        if (!cancelled) {
          setMiGrupo(data);
        }
      } catch {
        if (!cancelled) {
          setError("No se pudo cargar el grupo asignado");
          setMiGrupo(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    cargar();

    return () => {
      cancelled = true;
    };
  }, [examenId]);

  return { miGrupo, isLoading, error };
}
