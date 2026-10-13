"use client";

import { useState, useEffect, useCallback } from "react";
import { Colaborador, ExamenItem } from "../schemas/colaborador.schema";
import * as api from "../api/colaboradores.api";

export function useExamenesColaborador(colaborador: Colaborador | null) {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [asignados, setAsignados] = useState<ExamenItem[]>([]);
  const [disponibles, setDisponibles] = useState<api.ExamenDisponibleItem[]>([]);

  const fetchExamenes = useCallback(async () => {
    if (!colaborador) {
      setAsignados([]);
      setDisponibles([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await api.getExamenesColaborador(colaborador.id);
      setAsignados(data.asignados);
      setDisponibles(data.disponibles);
    } catch (err: unknown) {
      console.error("Error al cargar exámenes:", err);
      setError(err instanceof Error ? err.message : "Error al cargar exámenes");
    } finally {
      setLoading(false);
    }
  }, [colaborador]);

  useEffect(() => {
    fetchExamenes();
  }, [fetchExamenes]);

  const asignar = async (examenId: string | number) => {
    if (!colaborador) return { success: false, error: "Colaborador no seleccionado" };

    try {
      await api.asignarExamen(colaborador.id, examenId);
      await fetchExamenes();
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al asignar examen";
      return { success: false, error: msg };
    }
  };

  const quitar = async (examenId: string | number) => {
    if (!colaborador) return { success: false, error: "Colaborador no seleccionado" };

    try {
      await api.quitarExamen(colaborador.id, examenId);
      await fetchExamenes();
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al retirar examen";
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
