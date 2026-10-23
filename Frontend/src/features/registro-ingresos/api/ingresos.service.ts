// src/features/registro-ingresos/api/ingresos.service.ts
import { isAxiosError } from 'axios';
import { apiClient } from '@/shared/lib/api-client';
import {
  idbGet,
  idbPut,
  SULLU_STORES,
} from '@/shared/lib/offline-sullu-db';
import {
  examenesControlSchema,
  ingresosExamenSchema,
  type ExamenControl,
  type Ingreso,
  type IngresosExamen,
} from '../types/ingresos.types';

/* =============================================================================
   Endpoints:
   GET /examenes/control            -> [{ id, nombre, fecha }]
   GET /examenes/:id/ingresos       -> { examenId, ingresados, total, ingresos[] }
   ============================================================================= */

const FORCE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === 'true';

const EXAMENES_CACHE_KEY = 'sullu_examenes_control_cache';
const INGRESOS_CACHE_PREFIX = 'sullu_ingresos_examen_';

function isEndpointMissing(error: unknown): boolean {
  return isAxiosError(error) && error.response?.status === 404;
}

/* ---------- Mocks ---------- */

const MOCK_EXAMENES: ExamenControl[] = [
  { id: 1, nombre: 'Cálculo II – Examen Final', fecha: '2026-09-06' },
  { id: 2, nombre: 'Física I – Examen Parcial', fecha: '2026-09-07' },
  { id: 3, nombre: 'Programación II – Examen Final', fecha: '2026-09-08' },
];

const hora = (hms: string) => `2026-09-06T${hms}-04:00`;

const MOCK_INGRESOS_EX1: Ingreso[] = [
  { id: 6, hora: hora('09:04:32'), sis: '201900123', estudiante: 'Ana Rojas Mamani', metodo: 'QR', estado: 'Habilitado' },
  { id: 5, hora: hora('09:03:57'), sis: '202001456', estudiante: 'Diego Flores Vargas', metodo: 'QR', estado: 'Habilitado' },
  { id: 4, hora: hora('09:03:21'), sis: '201902345', estudiante: 'Valeria López Quispe', metodo: 'Manual', estado: 'Habilitado' },
  { id: 3, hora: hora('09:02:48'), sis: '202103678', estudiante: 'Mateo Pérez Arce', metodo: 'QR', estado: 'Habilitado' },
  { id: 2, hora: hora('09:02:06'), sis: '202002789', estudiante: 'Lucía Salazar Ríos', metodo: 'QR', estado: 'Habilitado' },
  { id: 1, hora: hora('09:01:39'), sis: '201901567', estudiante: 'Gabriel Fernández Soto', metodo: 'Manual', estado: 'Habilitado' },
];

function mockIngresos(examenId: string | number): IngresosExamen {
  const id = Number(examenId);
  if (id === 1) {
    return { examenId, ingresados: 42, total: 85, ingresos: MOCK_INGRESOS_EX1 };
  }
  if (id === 2) {
    return { examenId, ingresados: 2, total: 60, ingresos: MOCK_INGRESOS_EX1.slice(0, 2) };
  }
  return { examenId, ingresados: 0, total: 40, ingresos: [] };
}

/* ---------- Helpers de caché offline ---------- */

export function obtenerExamenesControlOffline(): ExamenControl[] | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(EXAMENES_CACHE_KEY);
  if (raw) {
    try {
      const parsed = examenesControlSchema.parse(JSON.parse(raw));
      if (parsed.length > 0) return parsed;
    } catch {}
  }

  // Fallback cruzado desde control-ingreso
  const rawAsig = localStorage.getItem('sullu_examenes_asignados_cache');
  if (rawAsig) {
    try {
      const items = JSON.parse(rawAsig) as Array<{
        id: number;
        asignatura?: string;
        nombre?: string;
        fecha?: string;
      }>;
      if (Array.isArray(items) && items.length > 0) {
        return items.map((i) => ({
          id: i.id,
          nombre: i.nombre || i.asignatura || 'Examen',
          fecha: i.fecha || new Date().toISOString().slice(0, 10),
        }));
      }
    } catch {}
  }

  // Fallback cruzado desde incidencias
  const rawInc = localStorage.getItem('sullu_examenes_incidencias_cache');
  if (rawInc) {
    try {
      const items = JSON.parse(rawInc) as Array<{
        id: string | number;
        nombre: string;
        fecha: string;
      }>;
      if (Array.isArray(items) && items.length > 0) {
        return items.map((i) => ({
          id: i.id,
          nombre: i.nombre || 'Examen',
          fecha: i.fecha || new Date().toISOString().slice(0, 10),
        }));
      }
    } catch {}
  }

  // Fallback desde examen activo en sesión (control-ingreso)
  try {
    const rawActive = sessionStorage.getItem('exacontrol_active_exam');
    if (rawActive) {
      const active = JSON.parse(rawActive) as {
        id?: number | string;
        examenId?: number | string;
        nombre?: string;
        asignatura?: string;
        fecha?: string;
      };
      if (active && (active.id || active.examenId)) {
        return [{
          id: active.id || active.examenId || 1,
          nombre: active.nombre || active.asignatura || 'Examen',
          fecha: active.fecha || new Date().toISOString().slice(0, 10),
        }];
      }
    }
  } catch {}

  // Fallback desde portal del estudiante
  try {
    const rawPortal = localStorage.getItem('exacontrol_offline_examenes');
    if (rawPortal) {
      const parsed = JSON.parse(rawPortal);
      const data = parsed.data || parsed;
      if (Array.isArray(data) && data.length > 0) {
        return data.map((item: { id?: string | number; examenId?: string | number; materia?: string; asignatura?: string; nombre?: string; fecha?: string }) => ({
          id: item.id || item.examenId || 1,
          nombre: item.materia || item.asignatura || item.nombre || 'Examen',
          fecha: item.fecha || new Date().toISOString().slice(0, 10),
        }));
      }
    }
  } catch {}

  return null;
}

export async function obtenerIngresosExamenOffline(
  examenId: string | number,
): Promise<IngresosExamen | null> {
  try {
    const record = await idbGet<{
      examenId: number;
      cachedAt: string;
      data: IngresosExamen;
    }>(SULLU_STORES.INGRESOS_VISTA, Number(examenId));

    if (record && record.data) {
      return record.data;
    }
  } catch {
    // Continuar a localStorage
  }

  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(`${INGRESOS_CACHE_PREFIX}${examenId}`);
    if (raw) {
      try {
        return ingresosExamenSchema.parse(JSON.parse(raw));
      } catch {
        return null;
      }
    }
  }

  return null;
}

/* ---------- API con Fallback Offline ---------- */

export async function getExamenesControl(): Promise<ExamenControl[]> {
  if (FORCE_MOCKS) return MOCK_EXAMENES;

  // Si no hay conexión en el navegador, responder desde el caché offline
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    const cached = obtenerExamenesControlOffline();
    if (cached) return cached;
  }

  try {
    const { data } = await apiClient.get('/examenes/control');
    const parsed = examenesControlSchema.parse(data);

    if (typeof window !== 'undefined' && parsed.length > 0) {
      try {
        localStorage.setItem(EXAMENES_CACHE_KEY, JSON.stringify(parsed));
      } catch {
        // Ignorar
      }
    }

    return parsed;
  } catch (error) {
    if (isEndpointMissing(error)) return MOCK_EXAMENES;

    // Si falló por falta de red, intentar recuperar del caché antes de propagar
    const cached = obtenerExamenesControlOffline();
    if (cached && (!isAxiosError(error) || !error.response)) {
      return cached;
    }

    throw error;
  }
}

export async function getIngresosExamen(
  examenId: string | number,
): Promise<IngresosExamen> {
  if (FORCE_MOCKS) return mockIngresos(examenId);

  // Helper para armar ingresos locales offline y fusionar con la cola local
  const armarIngresosOffline = async (): Promise<IngresosExamen> => {
    const cached = await obtenerIngresosExamenOffline(examenId);
    let pendientes: Ingreso[] = [];
    try {
      const rawPendientes = localStorage.getItem("sullu_offline_ingresos_queue");
      if (rawPendientes) {
        const items = JSON.parse(rawPendientes) as Array<{
          clienteSyncId: string;
          examenId: number | string;
          identificador: string;
          metodo: "QR" | "MANUAL";
          fechaHora: string;
          codSis?: string;
          nombreReferencial?: string;
        }>;
        pendientes = items
          .filter((i) => String(i.examenId) === String(examenId))
          .map((p) => ({
            id: p.clienteSyncId,
            hora: p.fechaHora,
            sis: p.codSis || p.identificador,
            estudiante: p.nombreReferencial || "Estudiante (offline)",
            metodo: p.metodo === "MANUAL" ? ("Manual" as const) : ("QR" as const),
            estado: "Habilitado" as const,
          }));
      }
    } catch {}

    if (cached) {
      return {
        ...cached,
        ingresados: cached.ingresados + pendientes.length,
        ingresos: [...pendientes, ...cached.ingresos],
      };
    }

    return {
      examenId: Number(examenId),
      ingresados: pendientes.length,
      total: pendientes.length,
      ingresos: pendientes,
    };
  };

  // Si el navegador está sin conexión, responder de inmediato con los datos locales
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return armarIngresosOffline();
  }

  try {
    const { data } = await apiClient.get(`/examenes/${examenId}/ingresos`);
    const parsed = ingresosExamenSchema.parse(data);

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          `${INGRESOS_CACHE_PREFIX}${examenId}`,
          JSON.stringify(parsed)
        );
        await idbPut(SULLU_STORES.INGRESOS_VISTA, {
          examenId: Number(examenId),
          cachedAt: new Date().toISOString(),
          data: parsed,
        });
      } catch {
        // Ignorar
      }
    }

    return parsed;
  } catch (error) {
    if (isEndpointMissing(error)) return mockIngresos(examenId);

    // Si falló por falta de red, recuperar datos locales en vez de romper la interfaz
    if (isAxiosError(error) && (!error.response || error.code === 'ERR_NETWORK')) {
      return armarIngresosOffline();
    }

    throw error;
  }
}
