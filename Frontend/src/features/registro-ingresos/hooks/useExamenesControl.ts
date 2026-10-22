// src/features/registro-ingresos/hooks/useExamenesControl.ts
"use client";

import { useEffect, useState } from "react";
import { getExamenesControl } from "../api/ingresos.service";
import type { ExamenControl } from "../types/ingresos.types";

export function useExamenesControl() {
  const [examenes, setExamenes] = useState<ExamenControl[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getExamenesControl()
      .then((data) => {
        if (!cancelled) setExamenes(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { examenes, isLoading, error };
}