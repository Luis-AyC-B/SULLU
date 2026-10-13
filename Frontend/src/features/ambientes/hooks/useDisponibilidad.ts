'use client';
import { useState, useEffect } from 'react';
import { PeriodoDisponibilidad } from '../schemas/ambiente.schema';
import { ambientesApi } from '../api/ambientes.api';
import { mensajeApi } from '../lib/integracion';
export function useDisponibilidad(ambienteId: string | number | null, fecha: string, version = 0) {
  const [state, setState] = useState<{ key: string; periodos: PeriodoDisponibilidad[]; error: string | null; loading: boolean }>({ key: '', periodos: [], error: null, loading: false });
  const [attempt, setAttempt] = useState(0);
  const key = `${ambienteId}:${fecha}:${version}:${attempt}`;
  useEffect(() => {
    if (!ambienteId || !fecha) return;
    const controller = new AbortController();
    setState({ key, periodos: [], error: null, loading: true });
    ambientesApi.getDisponibilidad(ambienteId, fecha, controller.signal).then(periodos => {
      if (!controller.signal.aborted) setState({ key, periodos, error: null, loading: false });
    }).catch(err => { if (!controller.signal.aborted) setState({ key, periodos: [], error: mensajeApi(err, 'Error al consultar disponibilidad.'), loading: false }); });
    return () => controller.abort();
  }, [ambienteId, fecha, key]);
  const current = state.key === key;
  return { periodos: current ? state.periodos : [], isLoading: Boolean(ambienteId) && (!current || state.loading), error: current ? state.error : null, refetch: () => setAttempt(n => n + 1) };
}
