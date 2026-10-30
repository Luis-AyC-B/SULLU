"use client";

import { useCallback, useEffect, useState } from "react";
import { getIncidenciasExamen } from "../api/incidencias.service";
import type { Incidencia } from "../types/incidencias.types";

// `incidencias` es null mientras no hay datos para el examen seleccionado.
// `recargar` vuelve a pedir la lista sin vaciar la que ya se está mostrando.
export function useIncidenciasExamen(examenId: string | null) {
  const [incidencias, setIncidencias] = useState<Incidencia[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recarga, setRecarga] = useState(0);

  // Al cambiar de examen se descartan los datos del anterior.
  useEffect(() => {
    setIncidencias(null);
    setError(null);
  }, [examenId]);

  useEffect(() => {
    if (!examenId) return;
    let cancelado = false;

    getIncidenciasExamen(examenId)
      .then((data) => {
        if (cancelado) return;
        setIncidencias(data);
        setError(null);
      })
      .catch((e: unknown) => {
        if (cancelado) return;
        setError(
          e instanceof Error
            ? e.message
            : "No se pudieron cargar las incidencias."
        );
      });

    return () => {
      cancelado = true;
    };
  }, [examenId, recarga]);

  const recargar = useCallback(() => {
    setError(null);
    setRecarga((n) => n + 1);
  }, []);

  // Escuchar evento de actualización offline para refrescar en vivo
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleUpdate = () => recargar();
    window.addEventListener("sullu_incidencias_offline_updated", handleUpdate);
    return () => {
      window.removeEventListener("sullu_incidencias_offline_updated", handleUpdate);
    };
  }, [recargar]);

  const isLoading = examenId !== null && incidencias === null && error === null;

  return { incidencias, isLoading, error, recargar };
}
