"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getIncidenciasExamen,
  getObservacionesIngreso,
} from "../api/incidencias.service";
import type { FiltrosIncidencias, Incidencia } from "../types/incidencias.types";

// `incidencias` es null mientras no hay datos para el examen o filtros seleccionados.
// `recargar` vuelve a pedir la lista sin vaciar la que ya se está mostrando.
export function useIncidenciasExamen(
  examenId: string | null,
  filtros?: FiltrosIncidencias
) {
  const [incidencias, setIncidencias] = useState<Incidencia[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recarga, setRecarga] = useState(0);

  // Al cambiar de filtros o examen se descartan los datos anteriores
  useEffect(() => {
    setIncidencias(null);
    setError(null);
  }, [
    examenId,
    filtros?.gestion,
    filtros?.facultadId,
    filtros?.carreraId,
    filtros?.docenteId,
    filtros?.materiaId,
    filtros?.motivo,
  ]);

  useEffect(() => {
    let cancelado = false;

    const peticion = filtros
      ? getObservacionesIngreso(filtros).then((res) => res.items)
      : examenId
      ? getIncidenciasExamen(examenId)
      : Promise.resolve([]);

    peticion
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
            : "No se pudieron cargar las observaciones de ingreso."
        );
      });

    return () => {
      cancelado = true;
    };
  }, [examenId, filtros, recarga]);

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

  const isLoading = incidencias === null && error === null;

  return { incidencias, isLoading, error, recargar };
}
