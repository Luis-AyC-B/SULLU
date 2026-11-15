"use client";

import { useState, useEffect, useCallback } from "react";
import { Colaborador, ExamenItem } from "../schemas/colaborador.schema";
import * as api from "../api/colaboradores.api";

export function useExamenesColaborador(colaborador: Colaborador | null) {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [asignados, setAsignados] = useState<ExamenItem[]>([]);
  const [disponibles, setDisponibles] = useState<api.ExamenDisponibleItem[]>([]);

  const colTargetId = colaborador?.colaboradorId || colaborador?.id;

  const fetchExamenes = useCallback(async () => {
    if (!colaborador || !colTargetId) {
      setAsignados([]);
      setDisponibles([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await api.getExamenesColaborador(colTargetId);
      setAsignados(data.asignados);
      // Solo exámenes que no hayan iniciado ni finalizado
      setDisponibles((data.disponibles || []).filter((item) => !item.yaInicio));
    } catch (err: unknown) {
      console.error("Error al cargar exámenes:", err);
      const msg =
        (err as any)?.response?.data?.message ||
        (err instanceof Error ? err.message : "Error al cargar exámenes");
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [colaborador, colTargetId]);

  useEffect(() => {
    fetchExamenes();
  }, [fetchExamenes]);

  const asignar = async (examenId: string | number) => {
    if (!colaborador || !colTargetId) return { success: false, error: "Colaborador no seleccionado" };

    try {
      await api.asignarExamen(colTargetId, examenId);
      await fetchExamenes();
      return { success: true };
    } catch (err: unknown) {
      const msg =
        (err as any)?.response?.data?.message ||
        (err instanceof Error ? err.message : "Error al asignar examen");
      return { success: false, error: msg };
    }
  };

  const quitar = async (examenId: string | number) => {
    if (!colaborador || !colTargetId) return { success: false, error: "Colaborador no seleccionado" };

    try {
      await api.quitarExamen(colTargetId, examenId);
      await fetchExamenes();
      return { success: true };
    } catch (err: unknown) {
      const msg =
        (err as any)?.response?.data?.message ||
        (err instanceof Error ? err.message : "Error al retirar examen");
      return { success: false, error: msg };
    }
  };

  return {
    asignados,
    disponibles,
    loading,
    error,
    asignar,
    quitar,
    refetch: fetchExamenes,
  };
}
