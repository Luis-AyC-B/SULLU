"use client";

import { useCallback, useEffect, useState } from "react";
import { ExamenItem } from "../types/estudiante.types";
import { estudianteService } from "../api/estudiante.service";

export function useExamenes() {
  const [examenes, setExamenes] = useState<ExamenItem[]>([]);
  const [selectedExamenId, setSelectedExamenId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchExamenes = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await estudianteService.getExamenes();
      if (Array.isArray(data) && data.length > 0) {
        setExamenes(data);
        setSelectedExamenId((prev) => {
          // Mantener el examen previamente seleccionado si aún existe en la lista
          if (prev && data.some((e) => e.id === prev)) {
            return prev;
          }
          return data[0].id;
        });
      } else {
        setExamenes([]);
        setSelectedExamenId(null);
      }
    } catch {
      setExamenes([]);
      setSelectedExamenId(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExamenes();
  }, [fetchExamenes]);

  const selectedExamen =
    selectedExamenId !== null
      ? examenes.find((e) => e.id === selectedExamenId) || null
      : null;

  return {
    examenes,
    selectedExamenId,
    setSelectedExamenId,
    selectedExamen,
    isLoading,
    refetch: fetchExamenes,
  };
}