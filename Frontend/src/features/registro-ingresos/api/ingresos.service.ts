// src/features/registro-ingresos/api/ingresos.service.ts
import { isAxiosError } from 'axios';
import { apiClient } from '@/shared/lib/api-client';
import {
  examenesControlSchema,
  ingresosExamenSchema,
  type ExamenControl,
  type Ingreso,
  type IngresosExamen,
} from '../types/ingresos.types';

/* =============================================================================
   Endpoints asumidos (confirmar con back):
   GET /examenes/control            -> [{ id, nombre, fecha }]
   GET /examenes/:id/ingresos       -> { examenId, ingresados, total, ingresos[] }
   La hora la define siempre el servidor. Este service no envía ni escribe horas.
   Mocks: se usan si NEXT_PUBLIC_USE_MOCKS === 'true' o si el endpoint responde 404.
   Un error de red NO cae a mocks, para poder mostrar el estado "desconectado".
   ============================================================================= */

const FORCE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === 'true';

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
  // Examen sin ingresos todavía (estado vacío)
  return { examenId, ingresados: 0, total: 40, ingresos: [] };
}

/* ---------- API ---------- */

export async function getExamenesControl(): Promise<ExamenControl[]> {
  if (FORCE_MOCKS) return MOCK_EXAMENES;
  try {
    const { data } = await apiClient.get('/examenes/control');
    return examenesControlSchema.parse(data);
  } catch (error) {
    if (isEndpointMissing(error)) return MOCK_EXAMENES;
    throw error;
  }
}

export async function getIngresosExamen(
  examenId: string | number,
): Promise<IngresosExamen> {
  if (FORCE_MOCKS) return mockIngresos(examenId);
  try {
    const { data } = await apiClient.get(`/examenes/${examenId}/ingresos`);
    return ingresosExamenSchema.parse(data);
  } catch (error) {
    if (isEndpointMissing(error)) return mockIngresos(examenId);
    throw error;
  }
}