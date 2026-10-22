'use client';

import { useCallback, useEffect, useState } from 'react';
import { getMisExamenes } from '../api/student-exam.service';
import {
  guardarExamenesOffline,
  obtenerExamenesOffline,
} from '../lib/offline-portal';
import type { Examen } from '../types/qr-examen';
import { adaptarRespuestaExamenes } from '../lib/adaptador-examenes';

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
  const [examenes, setExamenes] = useState<Examen[]>([]);
  const [verificacionFotoActiva, setVerificacionFotoActiva] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [fechaGuardado, setFechaGuardado] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      const data = await getMisExamenes();
      const adaptado = adaptarRespuestaExamenes(data);
      setExamenes(adaptado.examenes);
      setVerificacionFotoActiva(adaptado.verificacionFotoActiva);
      setIsOffline(false);
      setFechaGuardado(null);
      guardarExamenesOffline(adaptado.examenes);
    } catch {
      const cached = obtenerExamenesOffline();
      if (cached && cached.data && Array.isArray(cached.data)) {
        const adaptado = adaptarRespuestaExamenes(cached.data);
        setExamenes(adaptado.examenes);
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

  const actualizarExamen = useCallback((id: number, cambios: Partial<Examen>) => {
    setExamenes((prev) =>
      prev.map((ex) => (ex.id === id ? { ...ex, ...cambios } : ex)),
    );
  }, []);

  return {
    examenes,
    verificacionFotoActiva,
    isLoading,
    hasError,
    isOffline,
    fechaGuardado,
    retry: load,
    actualizarExamen,
  };
}

