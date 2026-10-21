'use client';

import { useCallback, useEffect, useState } from 'react';
import { getMisExamenes } from '../api/student-exam.service';
import {
  guardarExamenesOffline,
  obtenerExamenesOffline,
} from '../lib/offline-portal';
import type { ExamenEstudiante } from '../types/student-exam.types';

function formatearFecha(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.toLocaleDateString('es-BO')} a las ${d.toLocaleTimeString('es-BO', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  } catch {
    return iso;
  }
}

export function useStudentExams() {
  const [examenes, setExamenes] = useState<ExamenEstudiante[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [fechaGuardado, setFechaGuardado] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      const data = await getMisExamenes();
      setExamenes(data);
      setIsOffline(false);
      setFechaGuardado(null);
      guardarExamenesOffline(data);
    } catch {
      // Fallback offline
      const cached = obtenerExamenesOffline();
      if (cached && cached.data) {
        setExamenes(cached.data);
        setIsOffline(true);
        setFechaGuardado(formatearFecha(cached.cachedAt));
        setHasError(false);
      } else {
        setHasError(true);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { examenes, isLoading, hasError, isOffline, fechaGuardado, retry: load };
}
