"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { isAxiosError } from "axios";
import { DashboardAsistencia } from "../types/exam.types";
import { getDashboardAsistencia } from "../api/asistencia.api";

export function formatTiempoRelativo(isoDateString?: string): string {
  if (!isoDateString) return "Actualizado hace un momento";
  const date = new Date(isoDateString);
  if (isNaN(date.getTime())) return "Actualizado hace un momento";
  
  const diffMs = Math.max(0, Date.now() - date.getTime());
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 45) return "Actualizado hace unos segundos";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin <= 1) return "Actualizado hace 1 min";
  if (diffMin < 60) return `Actualizado hace ${diffMin} min`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours === 1) return "Actualizado hace 1 hora";
  return `Actualizado hace ${diffHours} horas`;
}

interface UseDashboardAsistenciaOptions {
  pollingIntervalMs?: number; // Por defecto 30 segundos si estado === 'EN_CURSO'
}

export function useDashboardAsistencia(
  examenId: string | number,
  options: UseDashboardAsistenciaOptions = {}
) {
  const { pollingIntervalMs = 30000 } = options;

  const [data, setData] = useState<DashboardAsistencia | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState<boolean>(false);
  const [isNotFound, setIsNotFound] = useState<boolean>(false);
  const [lastUpdatedLabel, setLastUpdatedLabel] = useState<string>("Actualizado hace un momento");

  const isMountedRef = useRef<boolean>(true);
  const dataRef = useRef<DashboardAsistencia | null>(null);
  dataRef.current = data;

  const fetchData = useCallback(
    async (_background?: boolean) => {
      if (!examenId) return;

      if (!dataRef.current) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }

      setError(null);

      try {
        const result = await getDashboardAsistencia(examenId);
        if (!isMountedRef.current) return;

        setData(result);
        setIsForbidden(false);
        setIsNotFound(false);
        setError(null);
        setLastUpdatedLabel(formatTiempoRelativo(result.ultimaActualizacion));
      } catch (err: unknown) {
        if (!isMountedRef.current) return;

        if (isAxiosError(err)) {
          const status = err.response?.status;
          if (status === 403) {
            setIsForbidden(true);
            setError("No tienes permiso para ver el dashboard de asistencia de este examen.");
          } else if (status === 404) {
            setIsNotFound(true);
            setError("Examen no localizado.");
          } else {
            // Error de red o servidor 5xx
            // Según Criterio 6 / EN2: Se conservan las últimas cifras mostradas
            setError("Error al obtener las cifras de asistencia. Verifica tu conexión e intenta de nuevo.");
          }
        } else {
          setError("Error inesperado al cargar la asistencia.");
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [examenId]
  );

  // Carga inicial
  useEffect(() => {
    isMountedRef.current = true;
    fetchData();

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchData]);

  // Actualizador continuo de la etiqueta de tiempo relativo cada 30 segundos
  useEffect(() => {
    const timer = setInterval(() => {
      if (data?.ultimaActualizacion) {
        setLastUpdatedLabel(formatTiempoRelativo(data.ultimaActualizacion));
      }
    }, 30000);

    return () => clearInterval(timer);
  }, [data?.ultimaActualizacion]);

  // Polling automático: Solo si el examen está en curso y no hubo 403/404
  useEffect(() => {
    if (!data) return;

    const isEnCurso =
      data.estado === "EN_CURSO" ||
      data.estado === "En curso";

    const isFinalizado =
      data.estado === "FINALIZADO" ||
      data.estado === "Finalizado" ||
      data.estado === "Desactivado" ||
      data.estado === "CANCELADO";

    // Si ya finalizó o hubo error de permisos, no programamos polling
    if (isFinalizado || isForbidden || isNotFound) {
      return;
    }

    if (!isEnCurso) {
      return;
    }

    const intervalId = setInterval(() => {
      fetchData();
    }, pollingIntervalMs);

    return () => {
      clearInterval(intervalId);
    };
  }, [data?.estado, isForbidden, isNotFound, pollingIntervalMs, fetchData]);

  const refrescar = useCallback(() => {
    return fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    isRefreshing,
    error,
    isForbidden,
    isNotFound,
    lastUpdatedLabel,
    refrescar,
  };
}
